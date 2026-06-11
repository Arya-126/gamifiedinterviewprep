import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  startInterview,
  reply,
  finishInterview,
  getInterview,
  listInterviews,
} from '../services/aiInterviewService';

const router = Router();

// GET /ai-interview — my past interviews
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    res.json(await listInterviews(req.userId!));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list interviews' });
  }
});

// POST /ai-interview/start { role, companyId? }
router.post('/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    res.json(await startInterview(req.userId!, req.body?.role, req.body?.companyId));
  } catch (error: any) {
    console.error('Interview start error:', error);
    res.status(400).json({ error: error.message || 'Failed to start interview' });
  }
});

// POST /ai-interview/:id/reply { content }
router.post('/:id/reply', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    res.json(await reply(req.params.id, req.userId!, req.body?.content));
  } catch (error: any) {
    console.error('Interview reply error:', error);
    res.status(400).json({ error: error.message || 'Failed to send answer' });
  }
});

// POST /ai-interview/:id/finish — end early and score
router.post('/:id/finish', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    res.json(await finishInterview(req.params.id, req.userId!));
  } catch (error: any) {
    console.error('Interview finish error:', error);
    res.status(400).json({ error: error.message || 'Failed to finish interview' });
  }
});

// GET /ai-interview/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    res.json(await getInterview(req.params.id, req.userId!));
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Interview not found' });
  }
});

export default router;
