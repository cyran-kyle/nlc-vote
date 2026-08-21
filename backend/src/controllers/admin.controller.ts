import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import jwt from 'jsonwebtoken';
import * as XLSX from 'xlsx';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { getDbPool } from '../config/db';
import { config } from '../config/env';
import { LevanterService } from '../services/levanter';

interface VoterRow extends RowDataPacket {
  student_id: string;
  full_name: string;
  department: string;
  level: string;
  phone_number: string;
  has_voted: number | boolean;
  otp_hash: string | null;
  otp_expires_at: string | null;
  created_at: string;
}

export class AdminController {
  /**
   * Admin Authentication with password
   */
  public static async login(req: Request, res: Response): Promise<void> {
    const { password } = req.body;

    if (!password || password !== config.security.adminPassword) {
      res.status(401).json({
        success: false,
        message: 'Invalid administrative password.',
      });
      return;
    }

    const token = jwt.sign(
      { role: 'admin', authorized_at: new Date().toISOString() },
      config.security.jwtSecret,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      success: true,
      message: 'Admin authentication successful.',
      data: { token },
    });
  }

  /**
   * Fetch high-level dashboard metrics
   */
  public static async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const db = getDbPool();

      // Voter counts and approval breakdown
      const [voterStats] = await db.query<RowDataPacket[]>(
        `SELECT 
          COUNT(*) AS total_registered,
          SUM(CASE WHEN has_voted = TRUE THEN 1 ELSE 0 END) AS total_voted,
          SUM(CASE WHEN has_voted = FALSE THEN 1 ELSE 0 END) AS total_pending,
          SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 ELSE 0 END) AS total_pending_approval,
          SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS total_approved,
          SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS total_rejected
         FROM voter_ledger`
      );

      // Registration & Polls status
      const [electionState] = await db.query<RowDataPacket[]>(
        'SELECT is_registration_open, is_active FROM elections ORDER BY created_at DESC LIMIT 1'
      );
      const isRegOpen = electionState.length > 0 ? Boolean(electionState[0].is_registration_open) : true;
      const isPollsOpen = electionState.length > 0 ? Boolean(electionState[0].is_active) : true;

      // Positions & Candidates counts
      const [positionStats] = await db.query<RowDataPacket[]>(
        'SELECT COUNT(*) AS total_positions FROM positions'
      );
      const [candidateStats] = await db.query<RowDataPacket[]>(
        'SELECT COUNT(*) AS total_candidates FROM candidates'
      );

      // Total cast ballots in votes table
      const [voteStats] = await db.query<RowDataPacket[]>(
        'SELECT COUNT(*) AS total_votes_recorded FROM votes'
      );

      // Recent audit logs
      const [recentLogs] = await db.query<RowDataPacket[]>(
        'SELECT id, event_type, description, ip_address, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10'
      );

      const totalRegistered = Number(voterStats[0]?.total_registered || 0);
      const totalVoted = Number(voterStats[0]?.total_voted || 0);
      const turnoutRate = totalRegistered > 0 ? ((totalVoted / totalRegistered) * 100).toFixed(1) : '0.0';

      res.status(200).json({
        success: true,
        data: {
          metrics: {
            total_registered: totalRegistered,
            total_voted: totalVoted,
            total_pending: totalRegistered - totalVoted,
            total_pending_approval: Number(voterStats[0]?.total_pending_approval || 0),
            total_approved: Number(voterStats[0]?.total_approved || 0),
            total_rejected: Number(voterStats[0]?.total_rejected || 0),
            turnout_percentage: parseFloat(turnoutRate),
            total_positions: Number(positionStats[0]?.total_positions || 0),
            total_candidates: Number(candidateStats[0]?.total_candidates || 0),
            total_votes_recorded: Number(voteStats[0]?.total_votes_recorded || 0),
            is_registration_open: isRegOpen,
            is_polls_open: isPollsOpen,
          },
          levanter: {
            api_url: config.levanter.apiUrl,
            api_key_set: Boolean(config.levanter.apiKey),
            mock_mode: config.levanter.mockMode,
          },
          recent_logs: recentLogs,
        },
      });
    } catch (error: any) {
      console.error('[AdminController.getDashboardStats] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch admin stats.',
      });
    }
  }

  /**
   * Get all registered voters with search and filter
   */
  public static async getVoters(req: Request, res: Response): Promise<void> {
    const search = ((req.query.search as string) || '').trim();
    const status = ((req.query.status as string) || 'all').toLowerCase();

    try {
      const db = getDbPool();
      let query = 'SELECT student_id, full_name, department, level, phone_number, has_voted, status, created_at FROM voter_ledger WHERE 1=1';
      const params: any[] = [];

      if (search) {
        query += ' AND (student_id LIKE ? OR full_name LIKE ? OR phone_number LIKE ? OR department LIKE ?)';
        const searchWildcard = `%${search}%`;
        params.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard);
      }

      if (status === 'voted') {
        query += ' AND has_voted = TRUE';
      } else if (status === 'pending') {
        query += ' AND has_voted = FALSE';
      } else if (status === 'pending_approval') {
        query += " AND status = 'PENDING_APPROVAL'";
      } else if (status === 'approved') {
        query += " AND status = 'APPROVED'";
      } else if (status === 'rejected') {
        query += " AND status = 'REJECTED'";
      }

      query += ' ORDER BY created_at DESC';

      const [voters] = await db.query<VoterRow[]>(query, params);

      res.status(200).json({
        success: true,
        data: voters,
      });
    } catch (error: any) {
      console.error('[AdminController.getVoters] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch voters list.',
      });
    }
  }

  /**
   * Add a single student manually
   */
  public static async addVoter(req: Request, res: Response): Promise<void> {
    const { student_id, full_name, department, level, phone_number } = req.body;

    if (!student_id || !full_name || !department || !phone_number) {
      res.status(400).json({
        success: false,
        message: 'Student ID, Full Name, Department, and Phone Number are required.',
      });
      return;
    }

    const cleanId = student_id.trim().toUpperCase();
    const cleanName = full_name.trim();
    const cleanDept = department.trim();
    const cleanLevel = (level || 'Level 100').trim();
    const normalizedPhone = LevanterService.normalizePhoneNumber(phone_number);

    try {
      const db = getDbPool();
      await db.query(
        `INSERT INTO voter_ledger (student_id, full_name, department, level, phone_number, has_voted)
         VALUES (?, ?, ?, ?, ?, FALSE)
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), department = VALUES(department), level = VALUES(level), phone_number = VALUES(phone_number)`,
        [cleanId, cleanName, cleanDept, cleanLevel, normalizedPhone]
      );

      res.status(200).json({
        success: true,
        message: `Student ${cleanId} added/updated on voter register successfully.`,
      });
    } catch (error: any) {
      console.error('[AdminController.addVoter] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add student to voter ledger.',
      });
    }
  }

  /**
   * Delete a student from voter ledger
   */
  public static async deleteVoter(req: Request, res: Response): Promise<void> {
    const { student_id } = req.params;
    try {
      const db = getDbPool();
      await db.query('DELETE FROM voter_ledger WHERE student_id = ?', [student_id]);
      res.status(200).json({
        success: true,
        message: `Student ${student_id} removed from voter ledger.`,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to delete student.' });
    }
  }

  /**
   * Reset voter status (allows voting again in test environments)
   */
  public static async resetVoterStatus(req: Request, res: Response): Promise<void> {
    const { student_id } = req.params;
    try {
      const db = getDbPool();
      await db.query(
        'UPDATE voter_ledger SET has_voted = FALSE, otp_hash = NULL, otp_expires_at = NULL WHERE student_id = ?',
        [student_id]
      );
      res.status(200).json({
        success: true,
        message: `Voting status reset to Pending for student ${student_id}.`,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to reset student voting status.' });
    }
  }

  /**
   * Bulk import student voters from JSON or uploaded Excel sheet
   */
  public static async bulkImportVoters(req: Request, res: Response): Promise<void> {
    let rawList: any[] = [];

    // Check if uploaded as file via multer
    const uploadedFile = (req as any).file;
    if (uploadedFile && uploadedFile.buffer) {
      try {
        const workbook = XLSX.read(uploadedFile.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        rawList = XLSX.utils.sheet_to_json(sheet);
      } catch (err: any) {
        res.status(400).json({ success: false, message: 'Failed to parse Excel file.' });
        return;
      }
    } else if (Array.isArray(req.body.voters)) {
      rawList = req.body.voters;
    } else {
      res.status(400).json({
        success: false,
        message: 'No voter data provided. Please provide an array or upload an Excel/CSV file.',
      });
      return;
    }

    if (rawList.length === 0) {
      res.status(400).json({ success: false, message: 'The uploaded file/data contains 0 rows.' });
      return;
    }

    try {
      const db = getDbPool();
      let importedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < rawList.length; i++) {
        const row = rawList[i];
        // Handle variations in column header names (case-insensitive)
        const id = (row['Student ID'] || row['student_id'] || row['ID'] || row['ID Number'] || '').toString().trim().toUpperCase();
        const name = (row['Full Name'] || row['full_name'] || row['Name'] || row['Student Name'] || '').toString().trim();
        const dept = (row['Department'] || row['department'] || row['Programme'] || 'General Studies').toString().trim();
        const level = (row['Level'] || row['level'] || row['Academic Level'] || 'Level 100').toString().trim();
        const phone = (row['WhatsApp Number'] || row['phone_number'] || row['Phone'] || row['WhatsApp'] || row['Phone Number'] || '').toString().trim();

        if (!id || !name || !phone) {
          skippedCount++;
          errors.push(`Row ${i + 1}: Missing Student ID, Name, or Phone`);
          continue;
        }

        const normalizedPhone = LevanterService.normalizePhoneNumber(phone);

        await db.query(
          `INSERT INTO voter_ledger (student_id, full_name, department, level, phone_number, has_voted)
           VALUES (?, ?, ?, ?, ?, FALSE)
           ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), department = VALUES(department), level = VALUES(level), phone_number = VALUES(phone_number)`,
          [id, name, dept, level, normalizedPhone]
        );

        importedCount++;
      }

      res.status(200).json({
        success: true,
        message: `Successfully processed ${importedCount} student voter records (${skippedCount} skipped).`,
        data: {
          imported: importedCount,
          skipped: skippedCount,
          errors: errors.slice(0, 10),
        },
      });
    } catch (error: any) {
      console.error('[AdminController.bulkImportVoters] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to import voter ledger.',
      });
    }
  }

  /**
   * Export Voter Ledger to an Excel file (.xlsx)
   */
  public static async exportVotersExcel(req: Request, res: Response): Promise<void> {
    try {
      const db = getDbPool();
      const [voters] = await db.query<RowDataPacket[]>(
        'SELECT student_id, full_name, department, level, phone_number, has_voted, created_at FROM voter_ledger ORDER BY student_id ASC'
      );

      const rows = voters.map((v) => ({
        'Student ID': v.student_id,
        'Full Name': v.full_name,
        'Department': v.department,
        'Level': v.level,
        'WhatsApp Number': v.phone_number,
        'Voting Status': v.has_voted ? 'VOTED' : 'PENDING',
        'Registered Date': v.created_at,
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Voter Ledger');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Disposition', 'attachment; filename=NLC_Voter_Ledger_Export.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (error: any) {
      console.error('[AdminController.exportVotersExcel] Error:', error);
      res.status(500).json({ success: false, message: 'Failed to export voter data.' });
    }
  }

  /**
   * Export Election Results to Excel (.xlsx)
   */
  public static async exportResultsExcel(req: Request, res: Response): Promise<void> {
    try {
      const db = getDbPool();
      const [electionRows] = await db.query<RowDataPacket[]>(
        'SELECT id, title, academic_year FROM elections WHERE is_active = TRUE LIMIT 1'
      );

      if (electionRows.length === 0) {
        res.status(404).json({ success: false, message: 'No active election found.' });
        return;
      }

      const election = electionRows[0];

      // Fetch results
      const [results] = await db.query<RowDataPacket[]>(
        `SELECT 
          p.title AS position_title,
          p.display_order AS position_order,
          c.full_name AS candidate_name,
          c.running_mate,
          c.tagline,
          COUNT(v.vote_id) AS vote_count
         FROM positions p
         INNER JOIN candidates c ON p.id = c.position_id
         LEFT JOIN votes v ON c.id = v.candidate_id AND v.election_id = ?
         WHERE p.election_id = ?
         GROUP BY p.id, p.title, p.display_order, c.id, c.full_name, c.running_mate, c.tagline
         ORDER BY p.display_order ASC, vote_count DESC`,
        [election.id, election.id]
      );

      const rows = results.map((r) => ({
        'Position': r.position_title,
        'Candidate Name': r.candidate_name,
        'Running Mate': r.running_mate || 'N/A',
        'Tagline': r.tagline || '',
        'Total Votes Received': Number(r.vote_count),
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Results Summary');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Disposition', 'attachment; filename=NLC_Election_Results_Export.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (error: any) {
      console.error('[AdminController.exportResultsExcel] Error:', error);
      res.status(500).json({ success: false, message: 'Failed to export results data.' });
    }
  }

  /**
   * Nominees & Positions Management
   */
  public static async getNominees(req: Request, res: Response): Promise<void> {
    try {
      const db = getDbPool();
      const [positions] = await db.query<RowDataPacket[]>(
        'SELECT id, election_id, title, description, max_selections, display_order FROM positions ORDER BY display_order ASC'
      );
      const [candidates] = await db.query<RowDataPacket[]>(
        'SELECT id, position_id, full_name, running_mate, tagline, manifesto, avatar_url, display_order FROM candidates ORDER BY display_order ASC'
      );

      const combined = positions.map((p) => ({
        ...p,
        candidates: candidates.filter((c) => c.position_id === p.id),
      }));

      res.status(200).json({
        success: true,
        data: combined,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch nominees.' });
    }
  }

  public static async createPosition(req: Request, res: Response): Promise<void> {
    const { title, description, display_order } = req.body;
    if (!title) {
      res.status(400).json({ success: false, message: 'Position title is required.' });
      return;
    }

    try {
      const db = getDbPool();
      const [election] = await db.query<RowDataPacket[]>('SELECT id FROM elections WHERE is_active = TRUE LIMIT 1');
      const electionId = election[0]?.id || 'el-nlc-2026';
      const positionId = `pos-${Date.now().toString(36)}`;

      await db.query(
        'INSERT INTO positions (id, election_id, title, description, display_order) VALUES (?, ?, ?, ?, ?)',
        [positionId, electionId, title.trim(), description?.trim() || null, Number(display_order) || 1]
      );

      res.status(201).json({ success: true, message: 'Position created successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to create position.' });
    }
  }

  public static async createCandidate(req: Request, res: Response): Promise<void> {
    const { position_id, full_name, running_mate, tagline, manifesto, avatar_url, display_order } = req.body;
    if (!position_id || !full_name) {
      res.status(400).json({ success: false, message: 'Position ID and Candidate Name are required.' });
      return;
    }

    try {
      const db = getDbPool();
      const candidateId = `cand-${Date.now().toString(36)}`;

      await db.query(
        `INSERT INTO candidates (id, position_id, full_name, running_mate, tagline, manifesto, avatar_url, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          candidateId,
          position_id,
          full_name.trim(),
          running_mate?.trim() || null,
          tagline?.trim() || null,
          manifesto?.trim() || null,
          avatar_url?.trim() || null,
          Number(display_order) || 1,
        ]
      );

      res.status(201).json({ success: true, message: 'Candidate added successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to add candidate.' });
    }
  }

  public static async deleteCandidate(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const db = getDbPool();
      await db.query('DELETE FROM candidates WHERE id = ?', [id]);
      res.status(200).json({ success: true, message: 'Candidate deleted.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to delete candidate.' });
    }
  }

  /**
   * Upload candidate photo
   */
  public static async uploadCandidatePhoto(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const uploadedFile = (req as any).file;

    if (!uploadedFile) {
      res.status(400).json({ success: false, message: 'No photo file provided.' });
      return;
    }

    try {
      const db = getDbPool();

      // Verify candidate exists
      const [existing] = await db.query<RowDataPacket[]>('SELECT id, avatar_url FROM candidates WHERE id = ?', [id]);
      if (existing.length === 0) {
        res.status(404).json({ success: false, message: 'Candidate not found.' });
        return;
      }

      // Ensure uploads directory exists
      const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'candidates');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Delete old photo if exists
      const oldUrl = existing[0].avatar_url;
      if (oldUrl) {
        const oldFilePath = path.join(__dirname, '..', '..', oldUrl.replace(/^\//, ''));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      // Save new photo
      const ext = path.extname(uploadedFile.originalname) || '.jpg';
      const filename = `${id}_${Date.now()}${ext}`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, uploadedFile.buffer);

      // Public URL path (served by express.static)
      const avatarUrl = `/uploads/candidates/${filename}`;

      await db.query('UPDATE candidates SET avatar_url = ? WHERE id = ?', [avatarUrl, id]);

      res.status(200).json({
        success: true,
        message: 'Candidate photo uploaded successfully.',
        data: { avatar_url: avatarUrl },
      });
    } catch (error: any) {
      console.error('[AdminController.uploadCandidatePhoto] Error:', error);
      res.status(500).json({ success: false, message: 'Failed to upload candidate photo.' });
    }
  }

  public static async deletePosition(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const db = getDbPool();
      await db.query('DELETE FROM positions WHERE id = ?', [id]);
      res.status(200).json({ success: true, message: 'Position and associated candidates deleted.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to delete position.' });
    }
  }

  /**
   * Bulk import positions & nominees from Excel sheet
   */
  public static async bulkImportNominees(req: Request, res: Response): Promise<void> {
    let rawList: any[] = [];

    const uploadedFile = (req as any).file;
    if (uploadedFile && uploadedFile.buffer) {
      try {
        const workbook = XLSX.read(uploadedFile.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        rawList = XLSX.utils.sheet_to_json(sheet);
      } catch (err: any) {
        res.status(400).json({ success: false, message: 'Failed to parse Excel file.' });
        return;
      }
    } else if (Array.isArray(req.body.nominees)) {
      rawList = req.body.nominees;
    } else {
      res.status(400).json({ success: false, message: 'No nominee data provided.' });
      return;
    }

    try {
      const db = getDbPool();
      const [election] = await db.query<RowDataPacket[]>('SELECT id FROM elections WHERE is_active = TRUE LIMIT 1');
      const electionId = election[0]?.id || 'el-nlc-2026';

      let imported = 0;

      for (const row of rawList) {
        const positionTitle = (row['Position'] || row['position'] || row['Portfolio'] || '').toString().trim();
        const candidateName = (row['Candidate Name'] || row['Name'] || row['candidate_name'] || '').toString().trim();
        const runningMate = (row['Running Mate'] || row['Vice'] || row['running_mate'] || '').toString().trim();
        const tagline = (row['Tagline'] || row['Motto'] || row['tagline'] || '').toString().trim();
        const manifesto = (row['Manifesto'] || row['manifesto'] || row['Bio'] || '').toString().trim();

        if (!positionTitle || !candidateName) continue;

        // Find or create position
        let positionId = '';
        const [posCheck] = await db.query<RowDataPacket[]>(
          'SELECT id FROM positions WHERE election_id = ? AND title = ? LIMIT 1',
          [electionId, positionTitle]
        );

        if (posCheck.length > 0) {
          positionId = posCheck[0].id;
        } else {
          positionId = `pos-${crypto.randomBytes(4).toString('hex')}`;
          await db.query(
            'INSERT INTO positions (id, election_id, title, display_order) VALUES (?, ?, ?, 1)',
            [positionId, electionId, positionTitle]
          );
        }

        // Insert candidate
        const candidateId = `cand-${crypto.randomBytes(4).toString('hex')}`;
        await db.query(
          `INSERT INTO candidates (id, position_id, full_name, running_mate, tagline, manifesto)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            candidateId,
            positionId,
            candidateName,
            runningMate || null,
            tagline || null,
            manifesto || null,
          ]
        );
        imported++;
      }

      res.status(200).json({
        success: true,
        message: `Successfully imported ${imported} nominees across positions.`,
      });
    } catch (error: any) {
      console.error('[AdminController.bulkImportNominees] Error:', error);
      res.status(500).json({ success: false, message: 'Failed to import nominees.' });
    }
  }

  /**
   * Diagnostic Live WhatsApp Gateway Test
   */
  public static async testWhatsAppGateway(req: Request, res: Response): Promise<void> {
    const { phone_number, test_message } = req.body;

    if (!phone_number) {
      res.status(400).json({
        success: false,
        message: 'Phone number is required for WhatsApp bot test.',
      });
      return;
    }

    try {
      const result = await LevanterService.testGatewayConnection(phone_number, test_message);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: `WhatsApp message dispatched successfully to +${result.phone} via ${result.endpointUsed}. Check WhatsApp chat!`,
          data: result,
        });
      } else {
        res.status(502).json({
          success: false,
          message: `Levanter Bot Gateway returned an error: ${result.error}`,
          data: result,
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: `WhatsApp Gateway test exception: ${error.message}`,
      });
    }
  }

  /**
   * Diagnostic Scanner: Probe all common routes on the Levanter VPS to find the exact active endpoint
   */
  public static async probeWhatsAppEndpoints(req: Request, res: Response): Promise<void> {
    try {
      const probeResults = await LevanterService.probeAllEndpoints();
      const currentActive = LevanterService.getActiveEndpoint();

      res.status(200).json({
        success: true,
        data: {
          current_active_endpoint: currentActive,
          probes: probeResults,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: `Failed to probe WhatsApp endpoints: ${error.message}`,
      });
    }
  }

  /**
   * Set custom active endpoint path
   */
  public static async updateEndpointPath(req: Request, res: Response): Promise<void> {
    const { endpoint_path } = req.body;
    if (!endpoint_path) {
      res.status(400).json({ success: false, message: 'Endpoint path is required' });
      return;
    }

    LevanterService.setActiveEndpoint(endpoint_path);
    res.status(200).json({
      success: true,
      message: `Active Levanter endpoint updated to "${LevanterService.getActiveEndpoint()}".`,
    });
  }

  /**
   * Toggle Election Voting Polls Open/Closed
   */
  public static async toggleElectionPolls(req: Request, res: Response): Promise<void> {
    const { is_open } = req.body;
    const shouldOpen = typeof is_open === 'boolean' ? is_open : true;

    try {
      const db = getDbPool();
      await db.query('UPDATE elections SET is_active = ? ORDER BY created_at DESC LIMIT 1', [shouldOpen]);

      await db.query(
        'INSERT INTO audit_logs (event_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?)',
        [
          'POLLS_STATUS_TOGGLED',
          `Admin toggled election voting polls to ${shouldOpen ? 'OPEN' : 'CLOSED'}`,
          req.ip || null,
          req.headers['user-agent'] || null,
        ]
      );

      res.status(200).json({
        success: true,
        message: `Election voting polls are now ${shouldOpen ? 'OPEN' : 'CLOSED'}.`,
        data: { is_polls_open: shouldOpen },
      });
    } catch (error: any) {
      console.error('[AdminController.toggleElectionPolls] Error:', error);
      res.status(500).json({ success: false, message: 'Failed to toggle election polls status.' });
    }
  }

  /**
   * Toggle Self-Registration Portal Open/Closed
   */
  public static async toggleRegistrationPortal(req: Request, res: Response): Promise<void> {
    const { is_open } = req.body;
    const shouldOpen = typeof is_open === 'boolean' ? is_open : true;

    try {
      const db = getDbPool();
      await db.query('UPDATE elections SET is_registration_open = ? WHERE is_active = TRUE', [shouldOpen]);

      await db.query(
        'INSERT INTO audit_logs (event_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?)',
        [
          'REGISTRATION_PORTAL_TOGGLED',
          `Admin toggled voter self-registration portal to ${shouldOpen ? 'OPEN' : 'CLOSED'}`,
          req.ip || null,
          req.headers['user-agent'] || null,
        ]
      );

      res.status(200).json({
        success: true,
        message: `Voter self-registration portal is now ${shouldOpen ? 'OPEN' : 'CLOSED'}.`,
        data: { is_registration_open: shouldOpen },
      });
    } catch (error: any) {
      console.error('[AdminController.toggleRegistrationPortal] Error:', error);
      res.status(500).json({ success: false, message: 'Failed to toggle registration portal.' });
    }
  }

  /**
   * Fetch all self-registrations awaiting admin approval
   */
  public static async getPendingRegistrations(req: Request, res: Response): Promise<void> {
    try {
      const db = getDbPool();
      const [pending] = await db.query<VoterRow[]>(
        `SELECT student_id, full_name, department, level, phone_number, status, created_at
         FROM voter_ledger
         WHERE status = 'PENDING_APPROVAL'
         ORDER BY created_at DESC`
      );

      res.status(200).json({
        success: true,
        data: pending,
      });
    } catch (error: any) {
      console.error('[AdminController.getPendingRegistrations] Error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch pending registrations.' });
    }
  }

  /**
   * Approve a student's self-registration and notify them on WhatsApp
   */
  public static async approveRegistration(req: Request, res: Response): Promise<void> {
    const { student_id } = req.params;

    try {
      const db = getDbPool();
      const [rows] = await db.query<VoterRow[]>(
        'SELECT student_id, full_name, department, level, phone_number, status FROM voter_ledger WHERE student_id = ?',
        [student_id]
      );

      if (rows.length === 0) {
        res.status(404).json({ success: false, message: 'Student registration record not found.' });
        return;
      }

      const student = rows[0];

      await db.query(
        "UPDATE voter_ledger SET status = 'APPROVED' WHERE student_id = ?",
        [student_id]
      );

      await db.query(
        'INSERT INTO audit_logs (event_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?)',
        [
          'REGISTRATION_APPROVED',
          `Admin approved voter registration for ${student_id} (${student.full_name})`,
          req.ip || null,
          req.headers['user-agent'] || null,
        ]
      );

      // Asynchronously send WhatsApp confirmation
      LevanterService.sendMessage(
        student.phone_number,
`🎉 *VOTER REGISTRATION APPROVED!*
━━━━━━━━━━━━━━━━━━━━━━
Hello *${student.full_name}*,

Your voter registration for the *New Life College 2026/2027 SRC General Elections* has been reviewed and APPROVED by the Electoral Commission!

📋 *Student ID:* \`${student.student_id}\`
🏫 *Department:* ${student.department} (${student.level})
🔒 *Status:* ACCREDITED VOTER

You can now cast your ballot at:
👉 http://localhost:3000

_New Life College Electoral Commission_`
      ).catch((err) => {
        console.error('[AdminController] WhatsApp approval notice failed:', err);
      });

      res.status(200).json({
        success: true,
        message: `Registration for ${student.full_name} (${student_id}) has been approved.`,
      });
    } catch (error: any) {
      console.error('[AdminController.approveRegistration] Error:', error);
      res.status(500).json({ success: false, message: 'Failed to approve registration.' });
    }
  }

  /**
   * Reject a student's self-registration
   */
  public static async rejectRegistration(req: Request, res: Response): Promise<void> {
    const { student_id } = req.params;

    try {
      const db = getDbPool();
      const [rows] = await db.query<VoterRow[]>(
        'SELECT student_id, full_name, phone_number FROM voter_ledger WHERE student_id = ?',
        [student_id]
      );

      if (rows.length === 0) {
        res.status(404).json({ success: false, message: 'Student record not found.' });
        return;
      }

      const student = rows[0];

      await db.query(
        "UPDATE voter_ledger SET status = 'REJECTED' WHERE student_id = ?",
        [student_id]
      );

      await db.query(
        'INSERT INTO audit_logs (event_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?)',
        [
          'REGISTRATION_REJECTED',
          `Admin rejected voter registration for ${student_id} (${student.full_name})`,
          req.ip || null,
          req.headers['user-agent'] || null,
        ]
      );

      // Notify student of rejection
      LevanterService.sendMessage(
        student.phone_number,
`⚠️ *VOTER REGISTRATION UPDATE*
━━━━━━━━━━━━━━━━━━━━━━
Hello *${student.full_name}*,

Your voter registration application for the *New Life College 2026/2027 SRC General Elections* could not be approved at this time.

If you believe this is an error, please visit the Electoral Commission Helpdesk with your student ID card.

_New Life College Electoral Commission_`
      ).catch((err) => {
        console.error('[AdminController] WhatsApp rejection notice failed:', err);
      });

      res.status(200).json({
        success: true,
        message: `Registration for ${student.full_name} (${student_id}) has been rejected.`,
      });
    } catch (error: any) {
      console.error('[AdminController.rejectRegistration] Error:', error);
      res.status(500).json({ success: false, message: 'Failed to reject registration.' });
    }
  }

  /**
   * Bulk Approve all pending registrations
   */
  public static async bulkApproveRegistrations(req: Request, res: Response): Promise<void> {
    try {
      const db = getDbPool();
      const [pending] = await db.query<VoterRow[]>(
        "SELECT student_id, full_name, phone_number, department, level FROM voter_ledger WHERE status = 'PENDING_APPROVAL'"
      );

      if (pending.length === 0) {
        res.status(200).json({ success: true, message: 'No pending registrations to approve.' });
        return;
      }

      await db.query("UPDATE voter_ledger SET status = 'APPROVED' WHERE status = 'PENDING_APPROVAL'");

      await db.query(
        'INSERT INTO audit_logs (event_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?)',
        [
          'REGISTRATIONS_BULK_APPROVED',
          `Admin bulk approved ${pending.length} pending voter registrations`,
          req.ip || null,
          req.headers['user-agent'] || null,
        ]
      );

      // Asynchronously notify each approved student
      for (const student of pending) {
        LevanterService.sendMessage(
          student.phone_number,
`🎉 *VOTER REGISTRATION APPROVED!*
━━━━━━━━━━━━━━━━━━━━━━
Hello *${student.full_name}*,

Your voter registration for the *New Life College 2026/2027 SRC General Elections* has been approved by the Electoral Commission!

📋 *Student ID:* \`${student.student_id}\`
🔒 *Status:* ACCREDITED VOTER

You can now cast your ballot at:
👉 http://localhost:3000

_New Life College Electoral Commission_`
        ).catch(() => {});
      }

      res.status(200).json({
        success: true,
        message: `Successfully approved all ${pending.length} pending student registrations.`,
      });
    } catch (error: any) {
      console.error('[AdminController.bulkApproveRegistrations] Error:', error);
      res.status(500).json({ success: false, message: 'Failed to bulk approve registrations.' });
    }
  }
}
