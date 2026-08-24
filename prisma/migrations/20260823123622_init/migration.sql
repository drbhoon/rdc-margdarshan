-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MENTEE', 'MENTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "CohortStatus" AS ENUM ('DRAFT', 'MATCHING', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PairStatus" AS ENUM ('PROPOSED', 'PENDING_ACCEPTANCE', 'ACCEPTED', 'DECLINED', 'ACTIVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'MISSED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- CreateTable
CREATE TABLE "Employee" (
    "employeeCode" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "joinDate" TIMESTAMP(3) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MENTEE',
    "discStyle" TEXT,
    "discRawResponse" JSONB,
    "careerGoals" TEXT,
    "topics" TEXT[],
    "availability" TEXT,
    "commStyleNotes" TEXT,
    "isConsentShared" BOOLEAN NOT NULL DEFAULT false,
    "mentorCapacity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("employeeCode")
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "CohortStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentoringPair" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "menteeCode" TEXT NOT NULL,
    "mentorCode" TEXT NOT NULL,
    "status" "PairStatus" NOT NULL DEFAULT 'PROPOSED',
    "matchScore" DOUBLE PRECISION NOT NULL,
    "declineReason" TEXT,
    "sharedGoals" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentoringPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "scheduledTime" TIMESTAMP(3),
    "googleMeetLink" TEXT,
    "calendarEventId" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "preSessionNotes" TEXT,
    "discussionPoints" TEXT,
    "insights" TEXT,
    "commitments" TEXT,
    "supportNeeded" TEXT,
    "recordingUrl" TEXT,
    "isRecordingConsentGranted" BOOLEAN NOT NULL DEFAULT false,
    "postSessionReflectionMentee" TEXT,
    "postSessionReflectionMentor" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedNotebook" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedNotebook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateNote" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivateNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "employeeCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "content" TEXT,
    "tags" TEXT[],
    "contributedByCode" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyFeedback" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "growthRating" INTEGER NOT NULL,
    "feedbackText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "performedByCode" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- AddForeignKey
ALTER TABLE "MentoringPair" ADD CONSTRAINT "MentoringPair_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentoringPair" ADD CONSTRAINT "MentoringPair_menteeCode_fkey" FOREIGN KEY ("menteeCode") REFERENCES "Employee"("employeeCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentoringPair" ADD CONSTRAINT "MentoringPair_mentorCode_fkey" FOREIGN KEY ("mentorCode") REFERENCES "Employee"("employeeCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "MentoringPair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedNotebook" ADD CONSTRAINT "SharedNotebook_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "MentoringPair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateNote" ADD CONSTRAINT "PrivateNote_employeeCode_fkey" FOREIGN KEY ("employeeCode") REFERENCES "Employee"("employeeCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_employeeCode_fkey" FOREIGN KEY ("employeeCode") REFERENCES "Employee"("employeeCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_contributedByCode_fkey" FOREIGN KEY ("contributedByCode") REFERENCES "Employee"("employeeCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyFeedback" ADD CONSTRAINT "SurveyFeedback_employeeCode_fkey" FOREIGN KEY ("employeeCode") REFERENCES "Employee"("employeeCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_performedByCode_fkey" FOREIGN KEY ("performedByCode") REFERENCES "Employee"("employeeCode") ON DELETE CASCADE ON UPDATE CASCADE;
