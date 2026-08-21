import { Router } from 'express';
import multer from 'multer';
import { AdminController } from '../controllers/admin.controller';
import { verifyAdminToken } from '../middleware/admin.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Public Admin Login
router.post('/login', AdminController.login);

// Protected Admin Routes
router.use(verifyAdminToken);

// Dashboard stats
router.get('/stats', AdminController.getDashboardStats);

// Voter Ledger Endpoints
router.get('/voters', AdminController.getVoters);
router.post('/voters', AdminController.addVoter);
router.delete('/voters/:student_id', AdminController.deleteVoter);
router.post('/voters/:student_id/reset', AdminController.resetVoterStatus);
router.post('/voters/import', upload.single('file'), AdminController.bulkImportVoters);
router.get('/voters/export', AdminController.exportVotersExcel);

// Results Export
router.get('/results/export', AdminController.exportResultsExcel);

// Nominees & Positions Endpoints
router.get('/nominees', AdminController.getNominees);
router.post('/positions', AdminController.createPosition);
router.delete('/positions/:id', AdminController.deletePosition);
router.post('/candidates', AdminController.createCandidate);
router.post('/candidates/:id/photo', upload.single('photo'), AdminController.uploadCandidatePhoto);
router.delete('/candidates/:id', AdminController.deleteCandidate);
router.post('/nominees/import', upload.single('file'), AdminController.bulkImportNominees);

// Election Polls & Registration Management
router.post('/election/toggle-polls', AdminController.toggleElectionPolls);
router.post('/registration/toggle', AdminController.toggleRegistrationPortal);
router.get('/registrations/pending', AdminController.getPendingRegistrations);
router.post('/registrations/:student_id/approve', AdminController.approveRegistration);
router.post('/registrations/:student_id/reject', AdminController.rejectRegistration);
router.post('/registrations/bulk-approve', AdminController.bulkApproveRegistrations);

// Live WhatsApp Bot Diagnostic Tests & Prober
router.post('/whatsapp/test', AdminController.testWhatsAppGateway);
router.get('/whatsapp/probe', AdminController.probeWhatsAppEndpoints);
router.post('/whatsapp/endpoint', AdminController.updateEndpointPath);

export default router;
