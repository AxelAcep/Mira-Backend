/*
  Warnings:

  - Added the required column `hadir` to the `Kehadiran` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Kehadiran" ADD COLUMN     "hadir" BOOLEAN NOT NULL;
