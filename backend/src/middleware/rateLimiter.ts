import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

/**
 * General API rate limiter for standard endpoints.
 */
export const generalLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMinutes * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
  },
});

/**
 * Strict rate limiter for OTP dispatch requests to prevent SMS/WhatsApp flooding.
 */
export const otpRequestLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMinutes * 60 * 1000,
  max: config.security.maxOtpPerWindow,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: `Maximum OTP requests exceeded. Please wait ${config.security.rateLimitWindowMinutes} minutes before requesting another code.`,
  },
});

/**
 * Rate limiter for ballot submissions to prevent automated vote flooding.
 */
export const ballotSubmitLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many ballot submission attempts. Please wait a moment.',
  },
});
