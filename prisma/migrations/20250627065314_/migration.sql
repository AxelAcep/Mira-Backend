/*
  Warnings:

  - Added the required column `durasi` to the `Recap` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Recap" ADD COLUMN     "durasi" TEXT NOT NULL;
