import { Router } from 'express';
import { RegisterController } from '../controllers/register.controller';

const router = Router();

// Student self-onboarding & status
router.get('/status', RegisterController.getRegistrationStatus);
router.post('/student', RegisterController.studentSelfRegister);

export default router;
