import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { getDbPool } from '../config/db';
import { LevanterService } from '../services/levanter';
import { maskPhoneNumber } from '../services/crypto';

export class RegisterController {
  /**
   * Check if student self-registration portal is currently open
   */
  public static async getRegistrationStatus(req: Request, res: Response): Promise<void> {
    try {
      const db = getDbPool();
      const [rows] = await db.query<RowDataPacket[]>(
        'SELECT is_registration_open FROM elections WHERE is_active = TRUE LIMIT 1'
      );

      const isOpen = rows.length > 0 ? Boolean(rows[0].is_registration_open) : true;
      res.status(200).json({
        success: true,
        data: { is_registration_open: isOpen },
      });
    } catch (error: any) {
      console.error('[RegisterController.getRegistrationStatus] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve registration status.',
      });
    }
  }

  /**
   * Public onboarding endpoint for students to register themselves on the voter ledger.
   */
  public static async studentSelfRegister(req: Request, res: Response): Promise<void> {
    const { student_id, full_name, department, level, phone_number } = req.body;

    if (!student_id || !full_name || !department || !phone_number) {
      res.status(400).json({
        success: false,
        message: 'All fields (Student ID, Full Name, Department, and WhatsApp Number) are required.',
      });
      return;
    }

    const cleanStudentId = student_id.trim().toUpperCase();
    const cleanFullName = full_name.trim();
    const cleanDepartment = department.trim();
    const cleanLevel = (level || 'Level 100').trim();
    const normalizedPhone = LevanterService.normalizePhoneNumber(phone_number);

    // Validate phone number format (must start with 233 and be 12 digits total for Ghana)
    if (!normalizedPhone.startsWith('233') || normalizedPhone.length !== 12) {
      res.status(400).json({
        success: false,
        message: `Invalid WhatsApp number format (${normalizedPhone}). Must start with 233 followed by 9 digits without '+' (e.g. 233540001122).`,
      });
      return;
    }

    try {
      const db = getDbPool();

      // Check if registration portal is open
      const [electionRows] = await db.query<RowDataPacket[]>(
        'SELECT is_registration_open FROM elections WHERE is_active = TRUE LIMIT 1'
      );

      if (electionRows.length > 0 && !Boolean(electionRows[0].is_registration_open)) {
        res.status(403).json({
          success: false,
          message: 'Voter Self-Registration is currently CLOSED by the Electoral Commission.',
        });
        return;
      }

      // Check if student ID already exists
      const [existing] = await db.query<RowDataPacket[]>(
        'SELECT student_id, full_name, status, has_voted FROM voter_ledger WHERE student_id = ?',
        [cleanStudentId]
      );

      if (existing.length > 0) {
        const student = existing[0];
        if (student.status === 'PENDING_APPROVAL') {
          res.status(409).json({
            success: false,
            message: `Student ID "${cleanStudentId}" has already submitted a registration and is currently PENDING review by the Electoral Commission.`,
          });
          return;
        }
        res.status(409).json({
          success: false,
          message: `Student ID "${cleanStudentId}" is already registered on the voter ledger.`,
        });
        return;
      }

      // Check if phone number is already registered to another student
      const [phoneExisting] = await db.query<RowDataPacket[]>(
        'SELECT student_id, full_name FROM voter_ledger WHERE phone_number = ?',
        [normalizedPhone]
      );

      if (phoneExisting.length > 0) {
        res.status(409).json({
          success: false,
          message: `WhatsApp number is already registered to another student (${phoneExisting[0].student_id}). Each student must use their own WhatsApp line.`,
        });
        return;
      }

      // Insert new student into voter_ledger with status = PENDING_APPROVAL
      await db.query(
        `INSERT INTO voter_ledger (student_id, full_name, department, level, phone_number, has_voted, status)
         VALUES (?, ?, ?, ?, ?, FALSE, 'PENDING_APPROVAL')`,
        [cleanStudentId, cleanFullName, cleanDepartment, cleanLevel, normalizedPhone]
      );

      // Audit log
      await db.query(
        'INSERT INTO audit_logs (event_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?)',
        [
          'STUDENT_SELF_REGISTERED',
          `Student ${cleanStudentId} (${cleanFullName}) submitted self-registration (Pending Review) with phone ${normalizedPhone}`,
          req.ip || null,
          req.headers['user-agent'] || null,
        ]
      );

      // Asynchronously send a submission notification via WhatsApp
      LevanterService.sendMessage(
        normalizedPhone,
`🗳️ *NEW LIFE COLLEGE VOTER REGISTRATION RECEIVED*
━━━━━━━━━━━━━━━━━━━━━━
Hello *${cleanFullName}*,

Your registration request for the *New Life College 2026/2027 SRC General Elections* has been received and is currently under review by the Electoral Commission.

📋 *Student ID:* \`${cleanStudentId}\`
🏫 *Department:* ${cleanDepartment} (${cleanLevel})
📱 *WhatsApp:* +${normalizedPhone}
⏳ *Status:* PENDING COMMISSION APPROVAL

You will receive an automated confirmation message as soon as your registration is approved.

_New Life College Electoral Commission_`
      ).catch((err) => {
        console.error('[RegisterController] WhatsApp submission notification error:', err);
      });

      res.status(201).json({
        success: true,
        message: 'Your registration details have been submitted successfully! Your application is pending review and approval by the Electoral Commission.',
        data: {
          student_id: cleanStudentId,
          full_name: cleanFullName,
          department: cleanDepartment,
          level: cleanLevel,
          status: 'PENDING_APPROVAL',
          masked_phone: maskPhoneNumber(normalizedPhone),
          raw_phone: normalizedPhone,
        },
      });
    } catch (error: any) {
      console.error('[RegisterController.studentSelfRegister] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred during voter registration.',
      });
    }
  }
}
