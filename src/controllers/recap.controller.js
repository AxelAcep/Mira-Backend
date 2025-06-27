const { PrismaClient } = require("@prisma/client");
const ClientError = require("../errors/ClientError");
const prisma = new PrismaClient();


function generateShortId(prefix = '') {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix;
    const length = 8 - prefix.length; // Jika prefix 2 karakter, sisanya 6 karakter acak

    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

const getRecapByKelas = async (req, res) => {
        try {
            const { kelasId } = req.params;

            if (!kelasId) {
                throw new ClientError("Kelas ID is required", 400);
            }

            const recapData = await prisma.recap.findMany({
                where: {
                    kodeKelas: kelasId,
                },
            });

            if (recapData.length === 0) {
                return res.status(404).json({ message: "No recap found for this class." });
            }

            res.status(200).json(recapData);
        } catch (error) {
            console.error("Error fetching recap data:", error);
            res.status(error.statusCode || 500).json({ message: error.message || "Internal Server Error" });
        }
    }

const createRecap = async (req, res) => {
    try {
        const { kodeKelas, dataMahasiswa, pertemuan, durasi } = req.body;

        if (!kodeKelas) {
            return res.status(400).json({ message: 'Kode Kelas wajib diisi.' });
        }

        let finalKodeRecap;
        let isKodeRecapUnique = false;
        while (!isKodeRecapUnique) {
            const tempKodeRecap = generateShortId('REC');
            const existingRecap = await prisma.recap.findUnique({
                where: { kodeRecap: tempKodeRecap },
            });
            if (!existingRecap) {
                finalKodeRecap = tempKodeRecap;
                isKodeRecapUnique = true;
            }
        }

        const newRecap = await prisma.recap.create({
            data: {
                kodeRecap: finalKodeRecap,
                kodeKelas: kodeKelas,
                pertemuan: pertemuan,
                durasi: durasi,
            },
        });

        const kodeRecap = newRecap.kodeRecap;

        // Langkah baru: Kumpulkan semua NIM unik dari data yang masuk
        const nimsToValidate = [...new Set(dataMahasiswa.map(mhs => mhs.nim).filter(Boolean))];

        // Temukan semua mahasiswa yang valid di database
        const existingMahasiswa = await prisma.mahasiswa.findMany({
            where: {
                nim: {
                    in: nimsToValidate,
                },
            },
            select: {
                nim: true, // Hanya perlu NIM-nya
            },
        });

        // Buat Set untuk pencarian cepat NIM yang valid
        const validNimsInDb = new Set(existingMahasiswa.map(mhs => mhs.nim));

        // Filter dataMahasiswa: Hanya proses yang memiliki NIM valid DAN ADA di database Mahasiswa
        const kehadiranData = dataMahasiswa
            .filter(mhs =>
                mhs.nim && typeof mhs.nim === 'string' && mhs.nim.trim() !== '' && // Filter NIM secara format
                validNimsInDb.has(mhs.nim) // Filter NIM yang benar-benar ada di database
            )
            .map(mhs => ({
                nim: mhs.nim,
                kodeRecap: kodeRecap,
                hadir: mhs.hadir,
            }));

        if (kehadiranData.length > 0) {
            await prisma.kehadiran.createMany({
                data: kehadiranData,
                skipDuplicates: true,
            });
        } else {
            console.warn('Tidak ada data mahasiswa yang valid dan terdaftar untuk dicatat kehadirannya.');
            // Anda bisa memilih untuk mengembalikan respons yang berbeda di sini jika tidak ada kehadiran yang dicatat
        }

        res.status(201).json({
            message: 'Recap dan data kehadiran berhasil dibuat.',
            recap: newRecap,
            kehadiran: kehadiranData,
            // Anda mungkin juga ingin mengembalikan nims yang gagal jika perlu untuk debugging atau UI feedback
            skippedNims: nimsToValidate.filter(nim => !validNimsInDb.has(nim))
        });

    } catch (error) {
        console.error('Error creating recap:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat membuat recap.', error: error.message });
    }
};

const deleteRecap = async (req, res) => {
    try {
        const { recapId } = req.params; // Ambil recapId dari parameter URL

        if (!recapId) {
            return res.status(400).json({ message: 'Recap ID is required.' });
        }

        // 1. Perbaiki pemanggilan findUnique: Gunakan 'where'
        const recap = await prisma.recap.findUnique({
            where: {
                kodeRecap: recapId, // Langsung gunakan recapId di dalam objek 'where'
            },
        });

        if (!recap) {
            return res.status(404).json({ message: 'Recap not found.' });
        }

        // 2. Hapus entri terkait di tabel Kehadiran
        await prisma.kehadiran.deleteMany({
            where: { kodeRecap: recap.kodeRecap }
        });

        await prisma.recap.delete({
            where: { kodeRecap: recapId }, // kodeRecap adalah String, tidak perlu parseInt
        });

        res.status(200).json({ message: 'Recap deleted successfully.' });
    } catch (error) {
        console.error('Error deleting recap:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat menghapus recap.', error: error.message });
    }
};

const getMahasiswaByRecap = async (req, res) => {
    try {
        const { recapId } = req.params;

        if (!recapId) {
            throw new ClientError("Recap ID is required", 400);
        }

        const kehadiran = await prisma.kehadiran.findMany({
            where: {
                kodeRecap: recapId,
            },
            // --- START: NEW/MODIFIED CODE ---
            // Include the related Mahasiswa (Student) data
            include: {
                // Assuming 'mahasiswa' is the relation name defined in your Prisma schema
                // between Kehadiran and Mahasiswa
                mahasiswa: {
                    select: {
                        nama: true, // Select the 'nama' field from the related Mahasiswa
                    },
                },
            },
            // --- END: NEW/MODIFIED CODE ---
        });

        // --- START: Transform data to include nama directly in each entry ---
        const transformedKehadiran = kehadiran.map(entry => ({
            nim: entry.nim, // Assuming 'nim' is directly on the Kehadiran model
            kodeRecap: entry.kodeRecap,
            hadir: entry.hadir,
            // Access the nama from the included mahasiswa object
            nama: entry.mahasiswa ? entry.mahasiswa.nama : 'Nama Tidak Ditemukan'
        }));
        // --- END: Transform data ---

        res.status(200).json({ message: 'Recap Search successfully.', kehadiran: transformedKehadiran });

    } catch (error) {
        console.error("Error fetching mahasiswa by recap:", error);
        throw error;
    }
};



module.exports = {
    getRecapByKelas,
    createRecap,
    deleteRecap,
    getMahasiswaByRecap,
};