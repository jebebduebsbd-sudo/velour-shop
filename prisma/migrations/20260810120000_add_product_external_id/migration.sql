-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_supplierId_externalId_key" ON "Product"("supplierId", "externalId");
