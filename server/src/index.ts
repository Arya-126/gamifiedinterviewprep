import express, { Express } from 'express';
import 'dotenv/config';
import authRoutes from './routes/auth';
import topicsRoutes from './routes/topics';
import gamesRoutes from './routes/games';
import dashboardRoutes from './routes/dashboard';
import { authMiddleware } from './middleware/auth';
import { db } from './firebase';

const app: Express = express();
const PORT = process.env.PORT || 4000;

// Middleware
// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/topics', topicsRoutes);
app.use('/games', gamesRoutes);
app.use('/dashboard', dashboardRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: '🎮 LearnHub API Server', status: 'running', endpoints: ['/health', '/auth/login', '/auth/register', '/topics', '/games', '/dashboard', '/debug/users'] });
});

// Debug: List all users (remove in production)
app.get('/debug/users', async (req, res) => {
  try {
    const snapshot = await db.ref('users').once('value');
    const users = snapshot.val();
    if (!users) {
      return res.json({ message: 'No users found', users: {} });
    }
    // Don't return passwords
    const safeUsers: any = {};
    for (const [id, user] of Object.entries(users)) {
      const u: any = user;
      safeUsers[id] = { id: u.id, name: u.name, email: u.email, role: u.role };
    }
    res.json({ totalUsers: Object.keys(users).length, users: safeUsers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Test protected route
app.get('/protected', authMiddleware, (req, res) => {
  res.json({ message: 'This is a protected route', userId: (req as any).userId });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Phase 1 server initialized`);
});
