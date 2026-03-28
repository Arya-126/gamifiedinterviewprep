import { Router, Request, Response } from 'express';
import { db } from '../firebase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here_change_in_production';

// Helper to find user by email
async function findUserByEmail(email: string) {
  const snapshot = await db.ref('users').once('value');
  const users = snapshot.val();
  
  if (!users) return null;
  
  for (const [userId, userData] of Object.entries(users)) {
    if ((userData as any).email === email) {
      return { id: userId, ...(userData as any) };
    }
  }
  return null;
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password required' });
    }

    // Check if user exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const userId = uuidv4();
    const userData = {
      id: userId,
      name,
      email,
      passwordHash,
      role: role || 'STUDENT',
      level: 1,
      xpTotal: 0,
      streakDays: 0,
      lastActiveAt: null,
      createdAt: new Date().toISOString()
    };

    await db.ref(`users/${userId}`).set(userData);

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      user: { id: userId, name, email, role: role || 'STUDENT', level: 1, xpTotal: 0, streakDays: 0 },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    console.log('Login request:', { email: req.body.email });
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ error: 'Email and password required' });
    }

    console.log('Finding user by email:', email);
    // Find user by email
    const user = await findUserByEmail(email);
    
    console.log('User found:', user ? 'yes' : 'no');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('Checking password...');
    // Check password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    console.log('Password valid:', isValid);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        level: user.level,
        xpTotal: user.xpTotal,
        streakDays: user.streakDays
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
