# LearnHub — Gamified Learning Platform

A comprehensive gamified learning platform where students search topics, play educational games, earn XP, and receive diagnostic testing with weakness detection (for college students).

> **Assessment platform: all 8 phases complete** — see [STATUS.md](STATUS.md) for the phase-by-phase record.
> Database is native PostgreSQL 18 (`learndb` @ 127.0.0.1:5432); browse it with the bundled pgAdmin 4 — setup steps in [docs/pgadmin-setup.md](docs/pgadmin-setup.md).

## Assessment Platform — Quick Run

```bash
# 1. Code-execution sandbox (Piston in WSL2 docker — auto-starts with WSL)
wsl -d Ubuntu -u root -- true        # wakes WSL; dockerd + Piston come up on boot
curl http://localhost:2000/api/v2/runtimes   # should list python/node/c++/java

# 2. Server (port 4000 — or set PORT if something else holds it)
cd server && npm run dev

# 3. Client
cd client && npm run dev             # http://localhost:5173
```

**Logins:** student `student@example.com` / `password` · admin `admin@example.com` / `password`

**What's where (assessment platform):**
- 📝 Mock Tests — placement-style tests (sections, autosave, server-side timing/grading), company pattern mocks (JP Morgan, Standard Chartered), Monaco coding questions with sandboxed run/submit
- 🤖 AI Interview — adaptive mock interview with rubric-scored report (Groq now; uses Anthropic automatically if `ANTHROPIC_API_KEY` is set)
- 🔍 Review Queue (admin) — confirm answer keys the AI solver proposed or disagreed on
- 🛠 Test Builder (admin) — sections with selection rules (RANDOM / ONE_PER_TOPIC, difficulty mix, verified-only)
- 📊 Attempt Reports (admin) — proctoring timeline + snapshots, integrity signal, cohort analytics, CSV export

**Key scripts** (`cd server`):
```bash
npx ts-node scripts/db-health.ts          # row counts for every table
npx ts-node scripts/solve-and-verify.ts   # AI answer keys (resumable; ~70 questions/day on Groq free tier)
npx ts-node scripts/verify-dsa.ts         # re-verify coding reference solutions through Piston
npx ts-node scripts/setup-piston.ts       # (re)install sandbox language runtimes
npx ts-node scripts/seed-handout.ts       # reload the 868-question bank (needs scripts/extract_handout.py first)
npx ts-node scripts/seed-dsa.ts           # reload the 14 coding problems
npx ts-node scripts/seed-sample-test.ts   # the "Full Mock" practice test
npx ts-node scripts/seed-companies.ts     # JP Morgan + Standard Chartered profiles
npx ts-node scripts/e2e-attempt.ts        # end-to-end attempt-lifecycle test (server on :4100)
npx ts-node scripts/purge-snapshots.ts    # proctoring snapshot retention (default 30 days)
```

Proctoring privacy & retention: [docs/proctoring-privacy.md](docs/proctoring-privacy.md)

## Phase 1 Status: COMPLETE ✅

All core features implemented. Ready to test end-to-end.

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- Redis (for Phase 3+, optional for Phase 1)
- Anthropic API key (for Phase 4+, optional for Phase 1)

### Installation

**1. Create PostgreSQL Database**
```bash
createdb learndb
# Or in PostgreSQL client:
# CREATE DATABASE learndb;
```

**2. Setup Server**
```bash
cd server
npm install
```

Create `.env` file:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/learndb
JWT_SECRET=your_super_secret_jwt_key_here
ANTHROPIC_API_KEY=sk-ant-xxx  (optional for Phase 1)
REDIS_URL=redis://localhost:6379  (optional for Phase 1)
PORT=4000
NODE_ENV=development
```

Initialize database:
```bash
npx prisma migrate dev
npx prisma db seed
```

Start server:
```bash
npm run dev
```

**3. Setup Client**
```bash
cd ../client
npm install
```

Create `.env` file:
```env
VITE_API_URL=http://localhost:4000
```

Start client:
```bash
npm run dev
```

**4. Test in Browser**
- Go to `http://localhost:5173`
- Login with: `student@example.com` / `password`
- Click "Play Game" → Select topic → Complete 10 questions

## Phase 1: Complete End-to-End Loop ✅

### Implemented Features

**Backend:**
- ✅ JWT authentication (register/login)
- ✅ Topic search with filtering by subject & difficulty
- ✅ Game session loader (10 random questions per topic)
- ✅ Game submission with score calculation
- ✅ XP reward system (easy: 10, medium: 18, hard: 25 + speed bonus)
- ✅ Level progression (9 levels: Rookie → Grandmaster)
- ✅ User dashboard stats endpoint
- ✅ All attempts stored in DB

**Frontend:**
- ✅ Beautiful gradient UI with Tailwind CSS
- ✅ Auth pages (login/register with demo credentials)
- ✅ Topic search page (subject filter, difficulty badges)
- ✅ Game session with:
  - 30-second timer per question (countdown)
  - Progress bar (question N of 10)
  - 4 multiple choice options
  - Instant feedback (correct/incorrect)
  - Correct answer reveal
  - Next/Finish button
- ✅ Dashboard with:
  - Current level + name
  - Total XP counter
  - Daily streak tracker
  - Progress bar to next level
  - Action buttons (Play Game, etc.)
  - Journey milestones

**Database:**
- ✅ Complete Prisma schema (all 9 models)
- ✅ 30 topics (Physics, Chemistry, Maths: 10 each)
- ✅ 300 sample questions (10 per topic)
- ✅ 3 test users (Student, College, Educator)

## Project Structure

```
/
├── server/                  # Express + Prisma backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts      # Register & login
│   │   │   ├── topics.ts    # Search topics
│   │   │   ├── games.ts     # Game sessions & submit
│   │   │   └── dashboard.ts # User stats
│   │   ├── services/
│   │   │   ├── xpService.ts         # XP logic
│   │   │   ├── weaknessDetector.ts  # Phase 3: weakness algorithm
│   │   │   └── aiQuestionGen.ts     # Phase 4: Claude API
│   │   ├── middleware/auth.ts       # JWT protection
│   │   └── index.ts                 # Server entry
│   ├── prisma/
│   │   ├── schema.prisma  # All 9 models
│   │   └── seed.ts        # Test data
│   └── package.json
│
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── SearchTopics.tsx  # Topic search + filter
│   │   │   ├── GameSession.tsx   # Game UI + timer + feedback
│   │   │   └── Dashboard.tsx     # User dashboard
│   │   ├── services/api.ts       # API client
│   │   ├── App.tsx               # Main app with navigation
│   │   ├── main.tsx              # React entry
│   │   └── index.css             # Tailwind
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
├── CLAUDE.md              # Project spec (single source of truth)
├── README.md              # This file
└── .gitignore
```

## Game Flow (Phase 1)

1. **Register/Login** → Authenticate with JWT
2. **Dashboard** → View XP, Level, Streak
3. **Search Topics** → Filter by subject, click "Play Game"
4. **Game** → 30-second timer per question
   - Read MCQ with 4 options
   - Select answer
   - Submit answer
   - See feedback (correct/incorrect + explanation)
   - Next question or finish
5. **Results** → Score + XP earned
6. **Dashboard Updated** → XP reflects immediately, level checks for upgrade

## Test Scenarios

### Scenario 1: Student Journey
```
1. Register as student
2. Search "Physics" topics
3. Click "Play Game" on "Mechanics"
4. Answer 10 questions (correct answers: "Option A")
5. See score + XP
6. Dashboard shows updated XP + level (if crossed threshold)
```

### Scenario 2: Login with Seeded User
```
1. Login: student@example.com / password
2. See dashboard with Level 1, 0 XP
3. Play game
4. Return to dashboard, XP updated
```

### Scenario 3: Multiple Games
```
1. Play Game 1: Physics → gain 100 XP
2. Play Game 2: Chemistry → gain 120 XP
3. Dashboard shows 220 XP total
```

## API Endpoints (Phase 1)

### Auth
```
POST /auth/register
  Body: { name, email, password, role }
  Response: { user, token }

POST /auth/login
  Body: { email, password }
  Response: { user, token }
```

### Topics
```
GET /topics/search?q=&subject=
  Response: Topic[]

GET /topics/:id
  Response: Topic with questions[]
```

### Games
```
GET /games/session/:topicId
  Response: { sessionId, topic, questions[] }

POST /games/session/submit
  Body: { topicId, answers[], durationSec }
  Response: { sessionId, score, xpEarned }
```

### Dashboard
```
GET /dashboard
  Response: { user, gamesPlayed }
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT, bcryptjs |
| Testing | Jest (for Phase 3) |
| AI | Anthropic Claude API (Phase 4) |
| Queue | BullMQ (Phase 3) |
| Cache | Redis (Phase 3) |

## What's Ready for Next Phases

**Phase 2 (Gamification):** 
- Streak system (logic in place, UI ready)
- Badges table schema ready
- Leaderboard endpoint stub

**Phase 3 (College + Weakness):**
- `weaknessDetector.ts` service complete
- Mastery score calculation ready
- Study plan auto-assignment ready
- BullMQ job structure ready
- Tests written for weakness algorithm

**Phase 4 (AI):**
- `aiQuestionGen.ts` with Claude API integration
- Hint generation ready
- Personalized explanation ready

## Common Issues & Fixes

**Error: "database doesn't exist"**
```bash
createdb learndb
npx prisma migrate dev
```

**Error: "Cannot find module '@prisma/client'"**
```bash
npm install
npx prisma generate
```

**Error: "Invalid JWT"**
- Make sure JWT_SECRET is the same in .env and auth.ts
- Check token is sent in Authorization header: `Bearer <token>`

**Game not loading questions:**
- Verify seed ran: `npx prisma db seed`
- Check PostgreSQL is running: `psql -U postgres -d learndb -c "SELECT COUNT(*) FROM \"Question\";"`

## Next Steps

1. **Run locally** and test the end-to-end flow
2. **Add more question types** (fill-blank, match-pair) for Phase 2
3. **Implement streaks** and badges (Phase 2)
4. **Add test module** for college students (Phase 3)
5. **Wire up background jobs** for mastery recalculation (Phase 3)
6. **Integrate Claude API** for question generation (Phase 4)

## Definition of Done: Phase 1 ✅

- [x] Student can register and log in
- [x] Student can search for topics
- [x] Student can play a 10-question game
- [x] Game has 30-second timer per question
- [x] Correct/incorrect feedback shown
- [x] XP awarded and saved to DB
- [x] Level checks for upgrade
- [x] Dashboard shows updated stats
- [x] All attempts stored in `QuestionAttempt`
- [x] No TypeScript errors
- [x] Database constraints enforced

---

**Phase 1 Complete!** 🎉  
**Ready for Phase 2 (Gamification)**  
Last updated: March 23, 2026

