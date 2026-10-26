-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "reported_issues" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reported_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reported_issues_userId_idx" ON "reported_issues"("userId");

-- AddForeignKey
ALTER TABLE "reported_issues" ADD CONSTRAINT "reported_issues_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
