import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { otpRequestLimiter } from '../middleware/rateLimiter';
import {
  validateRequest,
  requestOtpSchema,
  verifyOtpSchema,
} from '../middleware/validation';

const router = Router();

// Route: Request 6-digit OTP via WhatsApp
router.post(
  '/request-otp',
  otpRequestLimiter,
  validateRequest(requestOtpSchema),
  AuthController.requestOtp
);

// Route: Verify OTP code
router.post(
  '/verify-otp',
  validateRequest(verifyOtpSchema),
  AuthController.verifyOtp
);

export default router;
