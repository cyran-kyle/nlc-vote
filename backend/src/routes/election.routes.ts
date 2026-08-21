import { Router } from 'express';
import { ElectionController } from '../controllers/election.controller';
import { ballotSubmitLimiter } from '../middleware/rateLimiter';
import {
  validateRequest,
  ballotSubmissionSchema,
} from '../middleware/validation';

const router = Router();

// Route: Get current polls and registration status
router.get('/status', ElectionController.getStatus);

// Route: Get active election ballot (positions & candidates)
router.get('/ballot', ElectionController.getBallot);

// Route: Submit ballot atomically
router.post(
  '/submit',
  ballotSubmitLimiter,
  validateRequest(ballotSubmissionSchema),
  ElectionController.submitBallot
);

// Route: Get real-time public results and voter turnout
router.get('/results', ElectionController.getResults);

export default router;
