-- CreateEnum
CREATE TYPE "Prodi" AS ENUM ('S1_Informatika', 'S1_Sistem_Informasi', 'D3_Sistem_Informasi');

-- CreateTable
CREATE TABLE "dosen" (
    "nidn" TEXT NOT NULL,
    "nama" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "fotoProfil" TEXT,
    "jabatanFungsional" TEXT,
    "prodi" "Prodi",
    "kompetensi" INTEGER,

    CONSTRAINT "dosen_pkey" PRIMARY KEY ("nidn")
);

-- CreateTable
CREATE TABLE "mahasiswa" (
    "nim" TEXT NOT NULL,
    "nama" TEXT,
    "prodi" "Prodi",
    "linkFirebase" TEXT,

    CONSTRAINT "mahasiswa_pkey" PRIMARY KEY ("nim")
);

-- CreateTable
CREATE TABLE "matakuliah" (
    "kodeMatakuliah" TEXT NOT NULL,
    "namaMatakuliah" TEXT,

    CONSTRAINT "matakuliah_pkey" PRIMARY KEY ("kodeMatakuliah")
);

-- CreateTable
CREATE TABLE "kelas" (
    "kodeKelas" TEXT NOT NULL,
    "kodeMatakuliah" TEXT NOT NULL,
    "kodeDosen" TEXT NOT NULL,

    CONSTRAINT "kelas_pkey" PRIMARY KEY ("kodeKelas")
);

-- CreateTable
CREATE TABLE "kelasMahasiswa" (
    "kodeMatakuliah" TEXT NOT NULL,
    "kodeMahasiswa" TEXT NOT NULL,

    CONSTRAINT "kelasMahasiswa_pkey" PRIMARY KEY ("kodeMatakuliah","kodeMahasiswa")
);

-- CreateIndex
CREATE UNIQUE INDEX "dosen_email_key" ON "dosen"("email");

-- AddForeignKey
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_kodeMatakuliah_fkey" FOREIGN KEY ("kodeMatakuliah") REFERENCES "matakuliah"("kodeMatakuliah") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_kodeDosen_fkey" FOREIGN KEY ("kodeDosen") REFERENCES "dosen"("nidn") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelasMahasiswa" ADD CONSTRAINT "kelasMahasiswa_kodeMatakuliah_fkey" FOREIGN KEY ("kodeMatakuliah") REFERENCES "matakuliah"("kodeMatakuliah") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelasMahasiswa" ADD CONSTRAINT "kelasMahasiswa_kodeMahasiswa_fkey" FOREIGN KEY ("kodeMahasiswa") REFERENCES "mahasiswa"("nim") ON DELETE RESTRICT ON UPDATE CASCADE;
