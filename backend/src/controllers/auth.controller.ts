import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import jwt from 'jsonwebtoken';
import { getDbPool } from '../config/db';
import { config } from '../config/env';
import {
  generateNumericOtp,
  hashSha256,
  maskPhoneNumber,
} from '../services/crypto';
import { LevanterService } from '../services/levanter';

interface VoterRow extends RowDataPacket {
  student_id: string;
  full_name: string;
  department: string;
  level: string;
  phone_number: string;
  has_voted: number | boolean;
  status: 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED';
  otp_hash: string | null;
  otp_expires_at: string | null;
  last_otp_request_at: string | null;
}

export class AuthController {
  /**
   * Request OTP for student authentication.
   * Closed-loop: Only looks up pre-registered phone number in voter_ledger.
   */
  public static async requestOtp(req: Request, res: Response): Promise<void> {
    const { student_id } = req.body;
    const cleanStudentId = student_id.trim();

    try {
      const db = getDbPool();

      // 1. Fetch student record from voter_ledger
      const [rows] = await db.query<VoterRow[]>(
        'SELECT student_id, full_name, department, level, phone_number, has_voted, status, last_otp_request_at FROM voter_ledger WHERE student_id = ?',
        [cleanStudentId]
      );

      if (rows.length === 0) {
        res.status(404).json({
          success: false,
          message: `Student ID "${cleanStudentId}" is not registered on the official voter register. Please contact the Electoral Commission if you believe this is an error.`,
        });
        return;
      }

      const student = rows[0];

      // 2. Commission Approval Status Check
      if (student.status === 'PENDING_APPROVAL') {
        res.status(403).json({
          success: false,
          message: `Your registration for Student ID "${cleanStudentId}" is currently pending review by the Electoral Commission. You will receive a WhatsApp message once approved.`,
        });
        return;
      }

      if (student.status === 'REJECTED') {
        res.status(403).json({
          success: false,
          message: `Your voter registration application was not approved by the Electoral Commission. Please contact the Helpdesk for assistance.`,
        });
        return;
      }

      // 3. Strict eligibility check: Has the student already voted?
      if (Boolean(student.has_voted)) {
        res.status(403).json({
          success: false,
          already_voted: true,
          message: `Student ${student.full_name} (${cleanStudentId}) has already cast a ballot. Multiple voting is strictly prohibited.`,
        });
        return;
      }

      // 3. Cooldown check (prevent spamming resend within 30 seconds)
      if (student.last_otp_request_at) {
        const lastRequestTime = new Date(student.last_otp_request_at).getTime();
        const now = Date.now();
        const diffSeconds = (now - lastRequestTime) / 1000;
        if (diffSeconds < 30) {
          const remaining = Math.ceil(30 - diffSeconds);
          res.status(429).json({
            success: false,
            message: `Please wait ${remaining} seconds before requesting a new OTP.`,
            cooldown_seconds: remaining,
          });
          return;
        }
      }

      // 4. Generate 6-digit OTP and compute SHA-256 hash
      const plainOtp = generateNumericOtp();
      const otpHash = hashSha256(plainOtp);
      const expiryMinutes = config.security.otpExpiryMinutes;

      // 5. Store OTP hash with 5-minute expiration
      await db.query(
        `UPDATE voter_ledger 
         SET otp_hash = ?, 
             otp_expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE),
             last_otp_request_at = NOW()
         WHERE student_id = ?`,
        [otpHash, expiryMinutes, cleanStudentId]
      );

      // 6. Dispatch OTP via WhatsApp Levanter API
      const waResponse = await LevanterService.sendOtp(
        student.phone_number,
        student.full_name,
        student.student_id,
        plainOtp,
        expiryMinutes
      );

      // Audit log
      await db.query(
        'INSERT INTO audit_logs (event_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?)',
        [
          'OTP_REQUESTED',
          `OTP requested for student ${cleanStudentId}`,
          req.ip || null,
          req.headers['user-agent'] || null,
        ]
      );

      // 7. Return masked phone hint to the client
      const maskedPhone = maskPhoneNumber(student.phone_number);

      res.status(200).json({
        success: true,
        message: `A 6-digit OTP has been sent via WhatsApp to ${maskedPhone}.`,
        data: {
          student_id: student.student_id,
          full_name: student.full_name,
          department: student.department,
          level: student.level,
          masked_phone: maskedPhone,
          expires_in_seconds: expiryMinutes * 60,
        },
      });
    } catch (error: any) {
      console.error('[AuthController.requestOtp] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred while processing OTP request.',
      });
    }
  }

  /**
   * Verify student OTP and return a verified session token for ballot access.
   */
  public static async verifyOtp(req: Request, res: Response): Promise<void> {
    const { student_id, otp } = req.body;
    const cleanStudentId = student_id.trim();
    const cleanOtp = otp.trim();

    try {
      const db = getDbPool();

      // 1. Fetch student with row lock to check OTP hash and expiration
      const [rows] = await db.query<VoterRow[]>(
        `SELECT student_id, full_name, department, level, has_voted, otp_hash, otp_expires_at,
                (otp_expires_at > NOW()) AS is_valid_time
         FROM voter_ledger 
         WHERE student_id = ?`,
        [cleanStudentId]
      );

      if (rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Student record not found.',
        });
        return;
      }

      const student = rows[0];

      // 2. Check if already voted
      if (Boolean(student.has_voted)) {
        res.status(403).json({
          success: false,
          already_voted: true,
          message: 'This student account has already completed voting.',
        });
        return;
      }

      // 3. Verify OTP exists and has not expired
      if (!student.otp_hash || !student.otp_expires_at) {
        res.status(400).json({
          success: false,
          message: 'No active OTP request found. Please request a new OTP code.',
        });
        return;
      }

      const isExpired = !(student as any).is_valid_time;
      if (isExpired) {
        res.status(400).json({
          success: false,
          message: 'The OTP code has expired. Please request a fresh OTP.',
        });
        return;
      }

      // 4. Verify SHA-256 Hash
      const computedHash = hashSha256(cleanOtp);
      if (computedHash !== student.otp_hash) {
        res.status(400).json({
          success: false,
          message: 'Incorrect OTP code. Please check your WhatsApp and enter the 6 digits correctly.',
        });
        return;
      }

      // 5. Generate signed JWT session token valid for 15 minutes
      const token = jwt.sign(
        {
          studentId: student.student_id,
          fullName: student.full_name,
          department: student.department,
          level: student.level,
        },
        config.security.jwtSecret,
        { expiresIn: '15m' }
      );

      res.status(200).json({
        success: true,
        message: 'OTP verified successfully.',
        data: {
          token,
          student: {
            student_id: student.student_id,
            full_name: student.full_name,
            department: student.department,
            level: student.level,
          },
        },
      });
    } catch (error: any) {
      console.error('[AuthController.verifyOtp] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred while verifying OTP.',
      });
    }
  }
}
