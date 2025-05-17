/*
  Warnings:

  - You are about to drop the `dosen` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `kelas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `kelasMahasiswa` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `mahasiswa` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `matakuliah` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "kelas" DROP CONSTRAINT "kelas_kodeDosen_fkey";

-- DropForeignKey
ALTER TABLE "kelas" DROP CONSTRAINT "kelas_kodeMatakuliah_fkey";

-- DropForeignKey
ALTER TABLE "kelasMahasiswa" DROP CONSTRAINT "kelasMahasiswa_kodeMahasiswa_fkey";

-- DropForeignKey
ALTER TABLE "kelasMahasiswa" DROP CONSTRAINT "kelasMahasiswa_kodeMatakuliah_fkey";

-- DropTable
DROP TABLE "dosen";

-- DropTable
DROP TABLE "kelas";

-- DropTable
DROP TABLE "kelasMahasiswa";

-- DropTable
DROP TABLE "mahasiswa";

-- DropTable
DROP TABLE "matakuliah";

-- CreateTable
CREATE TABLE "Dosen" (
    "nidn" TEXT NOT NULL,
    "nama" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "fotoProfil" TEXT,
    "jabatanFungsional" TEXT,
    "prodi" "Prodi",
    "kompetensi" TEXT,

    CONSTRAINT "Dosen_pkey" PRIMARY KEY ("nidn")
);

-- CreateTable
CREATE TABLE "Mahasiswa" (
    "nim" TEXT NOT NULL,
    "nama" TEXT,
    "prodi" "Prodi",
    "linkFirebase" TEXT,

    CONSTRAINT "Mahasiswa_pkey" PRIMARY KEY ("nim")
);

-- CreateTable
CREATE TABLE "Matakuliah" (
    "kodeMatakuliah" TEXT NOT NULL,
    "namaMatakuliah" TEXT,
    "sks" INTEGER,

    CONSTRAINT "Matakuliah_pkey" PRIMARY KEY ("kodeMatakuliah")
);

-- CreateTable
CREATE TABLE "Kelas" (
    "kodeKelas" TEXT NOT NULL,
    "kodeMatakuliah" TEXT NOT NULL,
    "nidn" TEXT NOT NULL,
    "jadwal" TEXT,

    CONSTRAINT "Kelas_pkey" PRIMARY KEY ("kodeKelas")
);

-- CreateTable
CREATE TABLE "KelasMahasiswa" (
    "kodeKelas" TEXT NOT NULL,
    "kodeMahasiswa" TEXT NOT NULL,

    CONSTRAINT "KelasMahasiswa_pkey" PRIMARY KEY ("kodeKelas","kodeMahasiswa")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dosen_email_key" ON "Dosen"("email");

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_kodeMatakuliah_fkey" FOREIGN KEY ("kodeMatakuliah") REFERENCES "Matakuliah"("kodeMatakuliah") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_nidn_fkey" FOREIGN KEY ("nidn") REFERENCES "Dosen"("nidn") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KelasMahasiswa" ADD CONSTRAINT "KelasMahasiswa_kodeKelas_fkey" FOREIGN KEY ("kodeKelas") REFERENCES "Kelas"("kodeKelas") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KelasMahasiswa" ADD CONSTRAINT "KelasMahasiswa_kodeMahasiswa_fkey" FOREIGN KEY ("kodeMahasiswa") REFERENCES "Mahasiswa"("nim") ON DELETE RESTRICT ON UPDATE CASCADE;
