import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface AuthenticatedVoterPayload {
  studentId: string;
  fullName: string;
  department: string;
  level: string;
}

declare global {
  namespace Express {
    interface Request {
      voter?: AuthenticatedVoterPayload;
    }
  }
}

/**
 * Verifies optional temporary ballot session JWT token.
 */
export const verifyBallotToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Missing or malformed authorization token',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.security.jwtSecret) as AuthenticatedVoterPayload;
    req.voter = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired voting session token. Please re-authenticate.',
    });
  }
};
