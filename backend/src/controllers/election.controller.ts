import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { getDbPool, withTransaction } from '../config/db';
import {
  hashSha256,
  generateBallotReceiptHash,
  generateReceiptReferenceCode,
} from '../services/crypto';
import { LevanterService } from '../services/levanter';

interface VoterLockRow extends RowDataPacket {
  student_id: string;
  full_name: string;
  phone_number: string;
  has_voted: number | boolean;
  otp_hash: string | null;
  otp_expires_at: string | null;
  is_valid_time: number;
}

interface CandidateRow extends RowDataPacket {
  candidate_id: string;
  position_id: string;
  full_name: string;
  running_mate: string | null;
  tagline: string | null;
  manifesto: string | null;
  avatar_url: string | null;
  display_order: number;
}

interface PositionRow extends RowDataPacket {
  position_id: string;
  election_id: string;
  title: string;
  description: string | null;
  max_selections: number;
  display_order: number;
}

export class ElectionController {
  /**
   * Retrieves active election, open positions, and candidate profiles.
   */
  public static async getBallot(req: Request, res: Response): Promise<void> {
    try {
      const db = getDbPool();

      // 1. Fetch current active election
      const [elections] = await db.query<RowDataPacket[]>(
        'SELECT id, title, academic_year, description, start_time, end_time FROM elections WHERE is_active = TRUE LIMIT 1'
      );

      if (elections.length === 0) {
        res.status(404).json({
          success: false,
          message: 'No active election is currently open for voting.',
        });
        return;
      }

      const election = elections[0];

      // 2. Fetch positions for this election
      const [positions] = await db.query<PositionRow[]>(
        'SELECT id AS position_id, election_id, title, description, max_selections, display_order FROM positions WHERE election_id = ? ORDER BY display_order ASC',
        [election.id]
      );

      // 3. Fetch candidates for all positions
      const [candidates] = await db.query<CandidateRow[]>(
        `SELECT c.id AS candidate_id, c.position_id, c.full_name, c.running_mate, c.tagline, c.manifesto, c.avatar_url, c.display_order
         FROM candidates c
         INNER JOIN positions p ON c.position_id = p.id
         WHERE p.election_id = ?
         ORDER BY c.display_order ASC`,
        [election.id]
      );

      // Group candidates by position
      const structuredPositions = positions.map((pos) => ({
        id: pos.position_id,
        title: pos.title,
        description: pos.description,
        max_selections: pos.max_selections,
        display_order: pos.display_order,
        candidates: candidates
          .filter((cand) => cand.position_id === pos.position_id)
          .map((cand) => ({
            id: cand.candidate_id,
            name: cand.full_name,
            running_mate: cand.running_mate,
            tagline: cand.tagline,
            manifesto: cand.manifesto,
            avatar_url: cand.avatar_url,
          })),
      }));

      res.status(200).json({
        success: true,
        data: {
          election: {
            id: election.id,
            title: election.title,
            academic_year: election.academic_year,
            description: election.description,
            start_time: election.start_time,
            end_time: election.end_time,
          },
          positions: structuredPositions,
        },
      });
    } catch (error: any) {
      console.error('[ElectionController.getBallot] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching ballot data.',
      });
    }
  }

  /**
   * Submits a ballot atomically with row-level locking (SELECT ... FOR UPDATE)
   * and decoupled Two-Box database separation.
   */
  public static async submitBallot(req: Request, res: Response): Promise<void> {
    const { student_id, otp, election_id, votes } = req.body;
    const cleanStudentId = student_id.trim();
    const cleanOtp = otp.trim();

    const timestamp = Date.now();
    const receiptCode = generateReceiptReferenceCode();
    const ballotHash = generateBallotReceiptHash(election_id, timestamp);

    try {
      // Execute within an atomic ACID transaction
      const submissionResult = await withTransaction(async (connection) => {
        // STEP 1: Pessimistic Row Lock on voter_ledger
        // Prevents race conditions and double-voting concurrent requests
        const [voters] = await connection.query<VoterLockRow[]>(
          `SELECT student_id, full_name, phone_number, has_voted, otp_hash, otp_expires_at,
                  (otp_expires_at > NOW()) AS is_valid_time
           FROM voter_ledger 
           WHERE student_id = ? 
           FOR UPDATE`,
          [cleanStudentId]
        );

        if (voters.length === 0) {
          throw { status: 404, message: 'Student voter record not found in ledger.' };
        }

        const voter = voters[0];

        // STEP 2: Strict eligibility & duplicate check
        if (Boolean(voter.has_voted)) {
          throw {
            status: 403,
            message: 'Ballot submission rejected: You have already cast your vote.',
            already_voted: true,
          };
        }

        // STEP 3: OTP Hash Validation
        if (!voter.otp_hash || !voter.otp_expires_at) {
          throw { status: 400, message: 'No valid OTP found. Please request a new OTP code.' };
        }

        if (!voter.is_valid_time) {
          throw { status: 400, message: 'OTP has expired. Please request a new OTP to cast your ballot.' };
        }

        const computedHash = hashSha256(cleanOtp);
        if (computedHash !== voter.otp_hash) {
          throw { status: 400, message: 'Invalid OTP code provided. Ballot submission failed.' };
        }

        // STEP 4: Validate candidate selections against active database records
        for (const voteItem of votes) {
          const [validCandidate] = await connection.query<RowDataPacket[]>(
            `SELECT c.id FROM candidates c
             INNER JOIN positions p ON c.position_id = p.id
             WHERE c.id = ? AND p.id = ? AND p.election_id = ?`,
            [voteItem.candidate_id, voteItem.position_id, election_id]
          );

          if (validCandidate.length === 0) {
            throw {
              status: 400,
              message: `Invalid candidate selection for position ${voteItem.position_id}.`,
            };
          }
        }

        // STEP 5: Update Box 1 (voter_ledger) -> Mark as voted and invalidate OTP
        await connection.query(
          `UPDATE voter_ledger 
           SET has_voted = TRUE, 
               otp_hash = NULL, 
               otp_expires_at = NULL 
           WHERE student_id = ?`,
          [cleanStudentId]
        );

        // STEP 6: Insert into Box 2 (votes) -> Anonymous Ballot Vault
        // ZERO LINK TO STUDENT ID!
        for (const voteItem of votes) {
          await connection.query(
            `INSERT INTO votes (election_id, position_id, candidate_id, ballot_receipt_hash)
             VALUES (?, ?, ?, ?)`,
            [election_id, voteItem.position_id, voteItem.candidate_id, ballotHash]
          );
        }

        return {
          studentName: voter.full_name,
          phoneNumber: voter.phone_number,
          receiptCode,
          ballotHash,
        };
      });

      // STEP 7: Fetch Election Title for receipt
      const db = getDbPool();
      const [electionRow] = await db.query<RowDataPacket[]>(
        'SELECT title FROM elections WHERE id = ?',
        [election_id]
      );
      const electionTitle = electionRow[0]?.title || 'New Life College SRC Elections';

      // STEP 8: Trigger Asynchronous, Non-Blocking WhatsApp Delivery Confirmation Receipt
      // Wrapped in non-blocking try-catch so network delays do not stall the HTTP response
      LevanterService.sendVotingReceipt(
        submissionResult.phoneNumber,
        submissionResult.studentName,
        cleanStudentId,
        submissionResult.receiptCode,
        electionTitle
      ).catch((err) => {
        console.error('[ElectionController] Async WhatsApp receipt delivery error:', err);
      });

      // STEP 9: Audit log (Anonymous)
      await db.query(
        'INSERT INTO audit_logs (event_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?)',
        [
          'BALLOT_CAST_SUCCESS',
          `Ballot cast successfully with receipt ${receiptCode}`,
          req.ip || null,
          req.headers['user-agent'] || null,
        ]
      );

      // Return proof of vote
      res.status(200).json({
        success: true,
        message: 'Your ballot has been cast and locked securely.',
        data: {
          receipt_code: submissionResult.receiptCode,
          ballot_hash: submissionResult.ballotHash,
          election_title: electionTitle,
          timestamp: new Date(timestamp).toISOString(),
          anonymous_guarantee: '100% Cryptographically Decoupled',
        },
      });
    } catch (error: any) {
      console.error('[ElectionController.submitBallot] Error:', error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'An unexpected error occurred during ballot submission.',
        already_voted: error.already_voted || false,
      });
    }
  }

  /**
   * Retrieves public real-time election results, vote tallies, and voter turnout statistics.
   */
  public static async getResults(req: Request, res: Response): Promise<void> {
    try {
      const db = getDbPool();

      // 1. Fetch active election
      const [elections] = await db.query<RowDataPacket[]>(
        'SELECT id, title, academic_year, is_active FROM elections WHERE is_active = TRUE LIMIT 1'
      );

      if (elections.length === 0) {
        res.status(404).json({
          success: false,
          message: 'No active election found.',
        });
        return;
      }

      const election = elections[0];

      // 2. Fetch voter turnout statistics from voter_ledger (Aggregated only)
      const [turnoutRows] = await db.query<RowDataPacket[]>(
        `SELECT 
          COUNT(*) AS total_registered,
          SUM(CASE WHEN has_voted = TRUE THEN 1 ELSE 0 END) AS total_voted,
          SUM(CASE WHEN has_voted = FALSE THEN 1 ELSE 0 END) AS total_pending
         FROM voter_ledger`
      );

      const turnout = turnoutRows[0];
      const totalRegistered = Number(turnout.total_registered) || 0;
      const totalVoted = Number(turnout.total_voted) || 0;
      const turnoutPercentage =
        totalRegistered > 0 ? ((totalVoted / totalRegistered) * 100).toFixed(1) : '0.0';

      // 3. Fetch all positions
      const [positions] = await db.query<PositionRow[]>(
        'SELECT id, title, description, display_order FROM positions WHERE election_id = ? ORDER BY display_order ASC',
        [election.id]
      );

      // 4. Fetch candidate vote counts from the anonymous votes table
      const [candidateVotes] = await db.query<RowDataPacket[]>(
        `SELECT 
          c.id AS candidate_id,
          c.position_id,
          c.full_name,
          c.running_mate,
          c.avatar_url,
          c.display_order,
          COUNT(v.vote_id) AS vote_count
         FROM candidates c
         INNER JOIN positions p ON c.position_id = p.id
         LEFT JOIN votes v ON c.id = v.candidate_id AND v.election_id = ?
         WHERE p.election_id = ?
         GROUP BY c.id, c.position_id, c.full_name, c.running_mate, c.avatar_url, c.display_order
         ORDER BY c.display_order ASC`,
        [election.id, election.id]
      );

      // Group candidate results by position with percentage calculations
      const resultsByPosition = positions.map((pos) => {
        const posCandidates = candidateVotes.filter((c) => c.position_id === pos.id);
        const totalVotesInPosition = posCandidates.reduce(
          (sum, c) => sum + Number(c.vote_count),
          0
        );

        const candidatesWithPercentages = posCandidates.map((c) => {
          const votes = Number(c.vote_count);
          const percentage =
            totalVotesInPosition > 0 ? ((votes / totalVotesInPosition) * 100).toFixed(1) : '0.0';
          return {
            id: c.candidate_id,
            name: c.full_name,
            running_mate: c.running_mate,
            avatar_url: c.avatar_url,
            votes,
            percentage: parseFloat(percentage),
          };
        });

        // Sort descending by votes to highlight the leader
        candidatesWithPercentages.sort((a, b) => b.votes - a.votes);

        return {
          id: pos.id,
          title: pos.title,
          total_votes: totalVotesInPosition,
          candidates: candidatesWithPercentages,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          election: {
            id: election.id,
            title: election.title,
            academic_year: election.academic_year,
          },
          turnout: {
            total_registered: totalRegistered,
            total_voted: totalVoted,
            total_pending: totalRegistered - totalVoted,
            percentage: parseFloat(turnoutPercentage),
          },
          results: resultsByPosition,
        },
      });
    } catch (error: any) {
      console.error('[ElectionController.getResults] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching election results.',
      });
    }
  }
}
