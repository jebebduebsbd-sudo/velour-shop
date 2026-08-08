-- AlterEnum
ALTER TYPE "ProductStatus" ADD VALUE 'COMPLIANCE_REVIEW';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "supplierId" TEXT;

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "contractRef" TEXT,
    "transferEvidence" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'Global',
    "acquiredAt" TIMESTAMP(3),
    "evidenceVerified" BOOLEAN NOT NULL DEFAULT false,
    "complianceNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_evidenceVerified_idx" ON "Supplier"("evidenceVerified");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
