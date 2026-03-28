import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { db } from '../firebase';
import { v4 as uuidv4 } from 'uuid';

const XP_RULES = {
  correct_easy: 10,
  correct_medium: 18,
  correct_hard: 25,
  speed_bonus: 5
};

const LEVEL_THRESHOLDS = [0, 500, 1200, 2000, 3200, 5000, 8000, 12000, 18000];

const router = Router();

async function awardXp(userId: string, amount: number) {
  const userRef = db.ref(`users/${userId}`);
  const snapshot = await userRef.once('value');
  const user = snapshot.val();
  
  if (user) {
    const newXp = (user.xpTotal || 0) + amount;
    const newLevel = LEVEL_THRESHOLDS.findIndex(t => newXp < t);
    
    await userRef.update({
      xpTotal: newXp,
      level: newLevel === -1 ? LEVEL_THRESHOLDS.length : newLevel,
      lastActiveAt: new Date().toISOString()
    });
  }
}

router.get('/session/:topicId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { topicId } = req.params;

    // Get topic
    const topicSnapshot = await db.ref(`topics/${topicId}`).once('value');
    const topic = topicSnapshot.val();

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Get questions for this topic
    const qSnapshot = await db.ref('questions').orderByChild('topicId').equalTo(topicId).once('value');
    const questionsData = qSnapshot.val() || {};
    const questions = Object.entries(questionsData)
      .map(([id, q]: any) => ({ id, ...q }))
      .filter((q: any) => q.isApproved !== false)
      .slice(0, 10);

    if (questions.length === 0) {
      return res.status(400).json({ error: 'No approved questions for this topic' });
    }

    // Shuffle questions
    const shuffled = [...questions].sort(() => Math.random() - 0.5);

    res.json({
      sessionId: `session_${Date.now()}`,
      topic: { id: topic.id, name: topic.topic, subtopic: topic.subtopic },
      questions: shuffled.map((q: any) => ({
        id: q.id,
        text: q.questionText,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]')
      }))
    });
  } catch (error) {
    console.error('Game session error:', error);
    res.status(500).json({ error: 'Failed to load game session' });
  }
});

router.post('/session/submit', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { topicId, answers, durationSec } = req.body;
    const userId = req.userId!;

    if (!topicId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid submission' });
    }

    // Calculate score and XP
    let score = 0;
    let xpEarned = 0;
    const sessionId = uuidv4();

    for (const answer of answers) {
      // Get question
      const qSnapshot = await db.ref(`questions/${answer.questionId}`).once('value');
      const question = qSnapshot.val();

      if (!question) continue;

      const isCorrect = answer.answer === question.correctAnswer;

      if (isCorrect) {
        score += 10;
        const diffKey = `correct_${['easy', 'medium', 'hard'][question.difficulty - 1]}` as keyof typeof XP_RULES;
        const baseXp = XP_RULES[diffKey] || 10;
        xpEarned += baseXp;
        
        // Speed bonus
        if (answer.timeTakenMs < 5000) {
          xpEarned += XP_RULES.speed_bonus;
        }
      }

      // Store attempt
      const attemptId = uuidv4();
      await db.ref(`attempts/${attemptId}`).set({
        sessionId,
        userId,
        questionId: answer.questionId,
        isCorrect,
        timeTakenMs: answer.timeTakenMs || 0,
        hintUsed: answer.hintUsed || false,
        createdAt: new Date().toISOString()
      });
    }

    // Create game session
    await db.ref(`gameSessions/${sessionId}`).set({
      id: sessionId,
      userId,
      topicId,
      score,
      xpEarned,
      durationSec: durationSec || 0,
      playedAt: new Date().toISOString()
    });

    // Award XP
    await awardXp(userId, xpEarned);

    res.json({
      sessionId,
      score,
      xpEarned,
      message: 'Game session saved'
    });
  } catch (error) {
    console.error('Submit session error:', error);
    res.status(500).json({ error: 'Failed to submit session' });
  }
});

export default router;
