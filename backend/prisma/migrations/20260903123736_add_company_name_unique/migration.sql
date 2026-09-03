/*
  Warnings:

  - A unique constraint covering the columns `[companyName]` on the table `Client` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Client_companyName_key" ON "Client"("companyName");
