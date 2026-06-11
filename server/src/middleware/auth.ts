import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Role gate — use after authMiddleware. Looks the role up in the DB so a
// stale JWT can't carry a revoked role.
export function requireRole(...roles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { role: true },
      });
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      req.userRole = user.role;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Role check failed' });
    }
  };
}
