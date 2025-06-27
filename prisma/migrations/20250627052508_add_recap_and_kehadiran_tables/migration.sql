-- CreateTable
CREATE TABLE "Recap" (
    "kodeRecap" TEXT NOT NULL,
    "kodeKelas" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recap_pkey" PRIMARY KEY ("kodeRecap")
);

-- CreateTable
CREATE TABLE "Kehadiran" (
    "nim" TEXT NOT NULL,
    "kodeRecap" TEXT NOT NULL,

    CONSTRAINT "Kehadiran_pkey" PRIMARY KEY ("nim","kodeRecap")
);

-- AddForeignKey
ALTER TABLE "Recap" ADD CONSTRAINT "Recap_kodeKelas_fkey" FOREIGN KEY ("kodeKelas") REFERENCES "Kelas"("kodeKelas") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kehadiran" ADD CONSTRAINT "Kehadiran_nim_fkey" FOREIGN KEY ("nim") REFERENCES "Mahasiswa"("nim") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kehadiran" ADD CONSTRAINT "Kehadiran_kodeRecap_fkey" FOREIGN KEY ("kodeRecap") REFERENCES "Recap"("kodeRecap") ON DELETE RESTRICT ON UPDATE CASCADE;
