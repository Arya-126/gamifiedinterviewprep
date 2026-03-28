import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { db } from '../firebase';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Get user
    const userSnapshot = await db.ref(`users/${userId}`).once('value');
    const user = userSnapshot.val();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Count game sessions
    const sessSnapshot = await db.ref('gameSessions').orderByChild('userId').equalTo(userId).once('value');
    const sessions = sessSnapshot.val() ? Object.keys(sessSnapshot.val()).length : 0;

    const stats = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        level: user.level,
        xpTotal: user.xpTotal,
        streakDays: user.streakDays
      },
      gamesPlayed: sessions
    };

    res.json(stats);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

export default router;
