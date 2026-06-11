-- CreateEnum
CREATE TYPE "AssessmentCategory" AS ENUM ('QUANTITATIVE', 'LOGICAL', 'VERBAL', 'CODING');

-- CreateEnum
CREATE TYPE "AssessmentQuestionType" AS ENUM ('SINGLE', 'MULTI', 'FILL', 'TRUE_FALSE');

-- CreateEnum
CREATE TYPE "AssessmentDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "AssessmentTestMode" AS ENUM ('PRACTICE', 'PROCTORED');

-- CreateEnum
CREATE TYPE "AssessmentTestStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TestSectionKind" AS ENUM ('APTITUDE', 'VERBAL', 'LOGICAL', 'CODING', 'MIXED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProctoringEventType" AS ENUM ('TAB_BLUR', 'TAB_FOCUS', 'FULLSCREEN_EXIT', 'COPY', 'PASTE', 'FACE_NOT_DETECTED', 'MULTIPLE_FACES', 'NO_CAMERA', 'SNAPSHOT');

-- CreateEnum
CREATE TYPE "AiInterviewStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "AiInterviewTurnRole" AS ENUM ('INTERVIEWER', 'CANDIDATE');

-- AlterTable
ALTER TABLE "InterviewTheory" ADD COLUMN     "cleanedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "questionCount" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "testType" TEXT NOT NULL DEFAULT 'mixed',
ADD COLUMN     "timeLimitMin" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "TestQuestion" ADD COLUMN     "topicArea" TEXT NOT NULL DEFAULT 'aptitude';

-- CreateTable
CREATE TABLE "AssessmentTopic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "AssessmentCategory" NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "type" "AssessmentQuestionType" NOT NULL DEFAULT 'SINGLE',
    "difficulty" "AssessmentDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "stem" TEXT NOT NULL,
    "assets" JSONB,
    "explanation" TEXT,
    "proposedAnswer" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AssessmentOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingProblem" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "difficulty" "AssessmentDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "constraints" TEXT,
    "sampleIo" JSONB,
    "starterCode" JSONB,
    "referenceSolution" JSONB,
    "timeLimitMs" INTEGER NOT NULL DEFAULT 2000,
    "memoryLimitMb" INTEGER NOT NULL DEFAULT 256,
    "source" TEXT,
    "sourceUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodingProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL,
    "codingProblemId" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "weight" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "notes" TEXT,
    "profile" JSONB,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentTest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 90,
    "mode" "AssessmentTestMode" NOT NULL DEFAULT 'PRACTICE',
    "companyId" TEXT,
    "randomizeOrder" BOOLEAN NOT NULL DEFAULT false,
    "negativeMarking" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "passScore" INTEGER,
    "createdById" TEXT,
    "status" "AssessmentTestStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSection" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "TestSectionKind" NOT NULL,
    "selectionRule" JSONB,
    "marksPerQuestion" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TestSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSectionItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "questionId" TEXT,
    "codingProblemId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TestSectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestAttempt" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "durationUsedSec" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION,
    "breakdown" JSONB,
    "itemsSnapshot" JSONB,
    "consentAt" TIMESTAMP(3),

    CONSTRAINT "TestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptResponse" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT,
    "codingProblemId" TEXT,
    "answer" JSONB,
    "isCorrect" BOOLEAN,
    "marks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timeSpentSec" INTEGER NOT NULL DEFAULT 0,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttemptResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProctoringEvent" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "type" "ProctoringEventType" NOT NULL,
    "meta" JSONB,
    "snapshotUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProctoringEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiInterview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "companyId" TEXT,
    "status" "AiInterviewStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "overallScore" DOUBLE PRECISION,
    "rubricScores" JSONB,
    "summary" TEXT,

    CONSTRAINT "AiInterview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiInterviewTurn" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "role" "AiInterviewTurnRole" NOT NULL,
    "content" TEXT NOT NULL,
    "audioUrl" TEXT,
    "turnScore" DOUBLE PRECISION,
    "feedback" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "AiInterviewTurn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentTopic_slug_key" ON "AssessmentTopic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CodingProblem_slug_key" ON "CodingProblem"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "TestAttempt_testId_userId_idx" ON "TestAttempt"("testId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptResponse_attemptId_questionId_key" ON "AttemptResponse"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptResponse_attemptId_codingProblemId_key" ON "AttemptResponse"("attemptId", "codingProblemId");

-- CreateIndex
CREATE INDEX "ProctoringEvent_attemptId_createdAt_idx" ON "ProctoringEvent"("attemptId", "createdAt");

-- CreateIndex
CREATE INDEX "AiInterviewTurn_interviewId_order_idx" ON "AiInterviewTurn"("interviewId", "order");

-- AddForeignKey
ALTER TABLE "AssessmentTopic" ADD CONSTRAINT "AssessmentTopic_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AssessmentTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "AssessmentTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentOption" ADD CONSTRAINT "AssessmentOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingProblem" ADD CONSTRAINT "CodingProblem_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "AssessmentTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_codingProblemId_fkey" FOREIGN KEY ("codingProblemId") REFERENCES "CodingProblem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentTest" ADD CONSTRAINT "AssessmentTest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentTest" ADD CONSTRAINT "AssessmentTest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSection" ADD CONSTRAINT "TestSection_testId_fkey" FOREIGN KEY ("testId") REFERENCES "AssessmentTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSectionItem" ADD CONSTRAINT "TestSectionItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TestSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSectionItem" ADD CONSTRAINT "TestSectionItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSectionItem" ADD CONSTRAINT "TestSectionItem_codingProblemId_fkey" FOREIGN KEY ("codingProblemId") REFERENCES "CodingProblem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_testId_fkey" FOREIGN KEY ("testId") REFERENCES "AssessmentTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptResponse" ADD CONSTRAINT "AttemptResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptResponse" ADD CONSTRAINT "AttemptResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptResponse" ADD CONSTRAINT "AttemptResponse_codingProblemId_fkey" FOREIGN KEY ("codingProblemId") REFERENCES "CodingProblem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProctoringEvent" ADD CONSTRAINT "ProctoringEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInterview" ADD CONSTRAINT "AiInterview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInterview" ADD CONSTRAINT "AiInterview_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInterviewTurn" ADD CONSTRAINT "AiInterviewTurn_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "AiInterview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
