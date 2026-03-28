import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { db } from '../firebase';

const router = Router();

router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q = '', subject = '' } = req.query;
    const searchQuery = (q as string).toLowerCase();
    const filterSubject = (subject as string).toLowerCase();

    // Get all topics
    const snapshot = await db.ref('topics').once('value');
    const topicsData = snapshot.val() || {};

    // Filter topics
    let filteredTopics = Object.values(topicsData).filter((topic: any) => {
      const isActive = topic.isActive !== false;
      const matchesQuery = searchQuery === '' || 
        topic.subject?.toLowerCase().includes(searchQuery) ||
        topic.topic?.toLowerCase().includes(searchQuery) ||
        topic.subtopic?.toLowerCase().includes(searchQuery);
      const matchesSubject = filterSubject === '' || 
        topic.subject?.toLowerCase() === filterSubject;

      return isActive && matchesQuery && matchesSubject;
    });

    // Get question counts for each topic
    const result = await Promise.all(filteredTopics.map(async (topic: any) => {
      const qSnapshot = await db.ref(`questions`).orderByChild('topicId').equalTo(topic.id).once('value');
      const questions = qSnapshot.val() ? Object.values(qSnapshot.val()).filter((q: any) => q.isApproved !== false) : [];
      return { ...topic, questions: questions.map((q: any) => ({ id: q.id })) };
    }));

    res.json(result);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get topic
    const topicSnapshot = await db.ref(`topics/${id}`).once('value');
    const topic = topicSnapshot.val();

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Get questions for this topic
    const qSnapshot = await db.ref('questions').orderByChild('topicId').equalTo(id).once('value');
    const questionsData = qSnapshot.val() || {};
    const questions = Object.values(questionsData).filter((q: any) => q.isApproved !== false);

    res.json({ ...topic, questions });
  } catch (error) {
    console.error('Get topic error:', error);
    res.status(500).json({ error: 'Failed to get topic' });
  }
});

export default router;
