/*
  Warnings:

  - You are about to drop the column `Pertemuan` on the `Recap` table. All the data in the column will be lost.
  - Added the required column `pertemuan` to the `Recap` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Recap" DROP COLUMN "Pertemuan",
ADD COLUMN     "pertemuan" TEXT NOT NULL;
