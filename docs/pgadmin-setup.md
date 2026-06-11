# pgAdmin Setup — Browse `learndb`

PostgreSQL 18 and pgAdmin 4 are already installed natively on this machine (no Docker needed).
pgAdmin is bundled at `C:\Program Files\PostgreSQL\18\pgAdmin 4\`.

## 1. Launch pgAdmin

Start Menu → **pgAdmin 4** (or run `C:\Program Files\PostgreSQL\18\pgAdmin 4\runtime\pgAdmin4.exe`).
On first launch it asks you to set a *master password* — this protects saved
connection passwords locally; pick anything memorable.

## 2. Register the server

1. In the left tree, right-click **Servers → Register → Server…**
2. **General tab**
   - Name: `LearnHub local`
3. **Connection tab**
   - Host name/address: `127.0.0.1`
   - Port: `5432`
   - Maintenance database: `learndb`
   - Username: the user from `DATABASE_URL` in `server/.env` (default install: `postgres`)
   - Password: the password from `DATABASE_URL` in `server/.env`
   - Toggle **Save password** on
4. Click **Save**.

## 3. Find the tables

Tree path: **LearnHub local → Databases → learndb → Schemas → public → Tables**.

You should see the legacy game-arcade tables (`User`, `Topic`, `GameSession`, …),
the interview-prep tables (`InterviewCategory`, `InterviewQuestion`, …), and the
assessment platform tables added in Phase 1:

`AssessmentTopic`, `AssessmentQuestion`, `AssessmentOption`, `CodingProblem`,
`TestCase`, `Company`, `AssessmentTest`, `TestSection`, `TestSectionItem`,
`TestAttempt`, `AttemptResponse`, `ProctoringEvent`, `AiInterview`, `AiInterviewTurn`.

Right-click any table → **View/Edit Data → All Rows** to browse.

## 4. Quick health check from the terminal

```bash
cd server
npx ts-node scripts/db-health.ts   # prints row counts for every public table
```
