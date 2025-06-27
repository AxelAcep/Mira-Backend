/*
  Warnings:

  - Added the required column `Pertemuan` to the `Recap` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Recap" ADD COLUMN     "Pertemuan" TEXT NOT NULL;
