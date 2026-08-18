import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const requestOtpSchema = z.object({
  student_id: z
    .string({ required_error: 'Student ID is required' })
    .min(3, 'Student ID must be at least 3 characters')
    .max(32, 'Student ID cannot exceed 32 characters')
    .trim(),
});

export const verifyOtpSchema = z.object({
  student_id: z
    .string({ required_error: 'Student ID is required' })
    .min(3, 'Student ID must be at least 3 characters')
    .max(32, 'Student ID cannot exceed 32 characters')
    .trim(),
  otp: z
    .string({ required_error: 'OTP is required' })
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain numeric digits only'),
});

export const ballotSubmissionSchema = z.object({
  student_id: z
    .string({ required_error: 'Student ID is required' })
    .min(3)
    .max(32)
    .trim(),
  otp: z
    .string({ required_error: 'OTP is required' })
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain numeric digits only'),
  election_id: z.string({ required_error: 'Election ID is required' }),
  votes: z
    .array(
      z.object({
        position_id: z.string({ required_error: 'Position ID is required' }),
        candidate_id: z.string({ required_error: 'Candidate ID is required' }),
      })
    )
    .min(1, 'At least one vote selection must be provided'),
});

export const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((err) => err.message).join(', ');
        res.status(400).json({
          success: false,
          message: errorMessages,
          errors: error.errors,
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: 'Invalid request data',
      });
    }
  };
};
