-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "maxComplexityThreshold" INTEGER DEFAULT 15,
ADD COLUMN     "minScoreThreshold" INTEGER DEFAULT 70;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "passedQualityGate" BOOLEAN;
