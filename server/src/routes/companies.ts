import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /companies — list with profile summary (rounds + style, no internals)
router.get('/', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const companies = await prisma.company.findMany({ orderBy: { name: 'asc' } });
    res.json(
      companies.map((c) => {
        const profile = (c.profile as any) || {};
        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          logoUrl: c.logoUrl,
          rounds: (profile.rounds || []).map((r: any) => ({ title: r.title, count: r.count })),
          durationMinutes: profile.durationMinutes,
          hasInterviewStyle: !!profile.interviewStyle,
        };
      })
    );
  } catch (error) {
    console.error('Companies list error:', error);
    res.status(500).json({ error: 'Failed to list companies' });
  }
});

// POST /companies/:id/practice-test — build (once) and return the company's
// PROCTORED test, assembled from our own bank per the company profile.
router.post('/:id/practice-test', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const company = await prisma.company.findUnique({ where: { id: req.params.id } });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    const profile = (company.profile as any) || {};
    if (!Array.isArray(profile.rounds) || profile.rounds.length === 0) {
      return res.status(400).json({ error: 'Company has no round profile' });
    }

    const title = `${company.name} — Pattern Mock (Proctored)`;
    const existing = await prisma.assessmentTest.findFirst({
      where: { companyId: company.id, title, status: 'PUBLISHED' },
    });
    if (existing) return res.json({ testId: existing.id, title, reused: true });

    const test = await prisma.assessmentTest.create({
      data: {
        title,
        description: `Built from the ${company.name} pattern profile (round structure + difficulty mix). Questions come from our own verified bank.`,
        durationMinutes: profile.durationMinutes || 60,
        mode: 'PROCTORED',
        randomizeOrder: true,
        negativeMarking: Number(profile.negativeMarking) || 0,
        passScore: profile.passScore ?? null,
        status: 'PUBLISHED',
        companyId: company.id,
        createdById: req.userId,
        sections: {
          create: profile.rounds.map((r: any, i: number) => ({
            title: r.title || `Round ${i + 1}`,
            kind: r.kind || 'MIXED',
            order: i,
            marksPerQuestion: Number(r.marksPerQuestion) || 1,
            selectionRule: {
              strategy: r.strategy || 'RANDOM',
              category: r.category,
              count: r.count ?? 10,
              ...(r.difficultyMix ? { difficultyMix: r.difficultyMix } : {}),
              ...(r.topicSlugs ? { topicSlugs: r.topicSlugs } : {}),
              verifiedOnly: true, // PROCTORED enforces this anyway
            },
          })),
        },
      },
    });
    res.json({ testId: test.id, title: test.title, reused: false });
  } catch (error) {
    console.error('Company practice-test error:', error);
    res.status(500).json({ error: 'Failed to build company test' });
  }
});

export default router;
