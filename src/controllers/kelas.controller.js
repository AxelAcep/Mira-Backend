const { PrismaClient } = require("@prisma/client");
const ClientError = require("../errors/ClientError");
const passport = require('passport');
const { get } = require("http");
const prisma = new PrismaClient();
const supabase = require('../dataStorage'); 

const addMatakuliah = async (req, res, next) => {
    try {
        const { kodeMatakuliah, namaMatakuliah, sks } = req.body;
    
        const matakuliah = await prisma.matakuliah.create({
            data: {
                kodeMatakuliah,
                namaMatakuliah,
                sks,
            },
        });
    
        return res.status(201).json({
            message: "Matakuliah Berhasil Ditambahkan",
            data: matakuliah,
        });
    } catch (error) {
        return next(error);
    }
}

const createKelas = async (req, res, next) => {
try {
    const { kodeMatakuliah, ruangan ,jadwal } = req.body;
    const nidn = req.dosen.nidn;

    // Generate random 3 letters + 5 digits
    const generateKodeKelas = () => {
    const letters = Math.random().toString(36).substring(2, 5).toUpperCase(); // 3 huruf
    const numbers = Math.floor(10000 + Math.random() * 90000); // 5 angka
    return `${letters}${numbers}`;
    };

    const KodeKelas = generateKodeKelas();

    const kelas = await prisma.kelas.create({
    data: {
        kodeKelas: KodeKelas,
        kodeMatakuliah,
        nidn,
        jadwal,
        ruangan,
    },
    });

    return res.status(201).json({
    message: "Kelas Berhasil Dibuat!",
    data: kelas,
    });
} catch (error) {
    return next(error);
}
};


const getmatakuliah = async (req, res, next) => {
    try {
        const matakuliah = await prisma.matakuliah.findMany();
    
        return res.status(200).json({
            message: "Success",
            data: matakuliah,
        });
    } catch (error) {
        return next(error);
    }
}

const getKelasByDosen = async (req, res, next) => {
    try {
        const nidn = req.dosen.nidn;

        const kelas = await prisma.kelas.findMany({
            where: {
                nidn,
            },
            include: {
                matakuliah: { // Assuming 'matakuliah' is the relation field name in your Kelas model
                    select: {
                        namaMatakuliah: true, // Select only the course name
                    },
                },
            },
        });

        // Map the results to include the course name directly in each class object
        const kelasWithNamaMatakuliah = kelas.map(k => ({
            ...k,
            namaMatakuliah: k.matakuliah ? k.matakuliah.namaMatakuliah : null, // Handle cases where matakuliah might be null
        }));

        return res.status(200).json({
            message: "Success",
            data: kelasWithNamaMatakuliah,
        });
    } catch (error) {
        return next(error);
    }
}

const getMahasiswaByKelas = async (req, res, next) => {
    try {
        const { kodeKelas } = req.params;
        console.log(kodeKelas); //debugging
        const mahasiswa = await prisma.kelasMahasiswa.findMany({
            where: {
                kodeKelas,
            },
            include: {
                mahasiswa: true,
            },
        });
    
        return res.status(200).json({
            message: "Success",
            data: mahasiswa,
        });
    } catch (error) {
        return next(error);
    }
}

const addMahasiswa = async (req, res, next) => {
    try {
        const { kodeMahasiswa, kodeKelas } = req.body;

        // 1. Periksa apakah Mahasiswa dengan kodeMahasiswa tersebut ada
        const mahasiswaExists = await prisma.mahasiswa.findUnique({
            where: {
                nim: kodeMahasiswa // Asumsi 'nim' adalah primary key atau unique field untuk mahasiswa
            }
        });

        if (!mahasiswaExists) {
            return res.status(404).json({ // Menggunakan status 404 (Not Found) lebih tepat
                message: "Mahasiswa tidak ditemukan",
            });
        }

        // 2. Periksa apakah Mahasiswa sudah terdaftar di Kelas ini
        const existingKelasMahasiswa = await prisma.kelasMahasiswa.findFirst({
            where: {
                kodeMahasiswa,
                kodeKelas
            },
        });

        if (existingKelasMahasiswa) {
            return res.status(400).json({
                message: "Mahasiswa sudah terdaftar di kelas ini", // Perbarui pesan agar lebih spesifik
            });
        }

        // 3. Jika Mahasiswa ada dan belum terdaftar di kelas ini, buat entri baru
        const daftarMahasiswa = await prisma.kelasMahasiswa.create({
            data: {
                kodeMahasiswa,
                kodeKelas,
            },
        });

        return res.status(201).json({
            message: "Mahasiswa Berhasil Ditambahkan ke Kelas", // Perbarui pesan
            data: daftarMahasiswa,
        });
    } catch (error) {
        // Ini akan menangani error lain seperti masalah database, dll.
        return next(error);
    }
}

const uploudGambar = async (req, res, next) => {
    try {
        const { nim } = req.body;
        const files = req.files; // <-- Perubahan utama: Sekarang req.files (plural)

        if (!files || files.length === 0) {
            return res.status(400).json({ message: "Tidak ada file yang ditemukan." });
        }

        const mahasiswa = await prisma.mahasiswa.findUnique({
            where: {
                nim: nim,
            },
            select: { // Hanya ambil field yang dibutuhkan
                nama: true,
                // linkFirebase: true, // Jika masih ingin pakai linkFirebase
            },
        });

        if (!mahasiswa) {
            return res.status(404).json({ message: "Mahasiswa tidak ditemukan." });
        }

        const namaMahasiswa = mahasiswa.nama;
        const bucketName = 'mira';
        const uploadedFileDetails = []; // Untuk menyimpan detail setiap file yang berhasil diunggah

        // Loop melalui setiap file yang diterima
        for (const file of files) { // Iterasi setiap file dalam array req.files
            const uploadPath = `mahasiswa/${namaMahasiswa}/${file.originalname}`; // Path untuk Supabase

            console.log(`Mengunggah file: ${file.originalname} ke ${uploadPath} di bucket: ${bucketName}`);

            const { error: uploadError } = await supabase
                .storage
                .from(bucketName)
                .upload(uploadPath, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true, // Akan menimpa jika sudah ada dengan nama yang sama
                });

            if (uploadError) {
                // Jika ada satu file yang gagal, kita bisa memilih untuk:
                // 1. Menghentikan seluruh proses dan mengembalikan error
                // 2. Melanjutkan upload file lain dan hanya melaporkan file yang gagal
                // Untuk contoh ini, kita akan menghentikan proses jika ada kegagalan upload.
                console.error(`Gagal mengunggah file ${file.originalname}:`, uploadError);
                return res.status(500).json({
                    message: `Gagal mengunggah beberapa gambar. Kegagalan pada file: ${file.originalname}.`,
                    error: uploadError.message
                });
            }

            // Dapatkan URL publik setelah upload berhasil
            const publicUrl = supabase.storage
                .from(bucketName)
                .getPublicUrl(uploadPath).data.publicUrl;

            uploadedFileDetails.push({
                filename: file.originalname,
                folder: namaMahasiswa,
                mimetype: file.mimetype,
                size: file.size,
                publicUrl: publicUrl, // Sertakan URL publik untuk setiap file
            });
        }

        return res.status(200).json({
            message: "Gambar-gambar berhasil diunggah.",
            data: uploadedFileDetails, // Mengembalikan array detail file yang diunggah
        });

    } catch (error) {
        console.error("Kesalahan tak terduga saat mengunggah gambar:", error);
        return next(error);
    }
};

const removeMahasiswa = async (req, res, next) => {
    try {
        const { nim, kodeKelas } = req.body;

        // Use the composite unique key in the where clause
        const removedMahasiswa = await prisma.KelasMahasiswa.delete({
            where: {
                kodeKelas_kodeMahasiswa: { // This is the composite unique key
                    kodeMahasiswa: nim,
                    kodeKelas: kodeKelas,
                },
            },
        });

        return res.status(200).json({
            message: "Mahasiswa Berhasil Dihapus",
            data: removedMahasiswa, // Changed variable name to be consistent
        });
    } catch (error) {
        // Handle specific error for record not found (P2025)
        if (error.code === 'P2025') {
            return res.status(404).json({
                message: "Mahasiswa tidak ditemukan di kelas ini.",
                error: error.message
            });
        }
        return next(error);
    }
}

const deleteImageFromSupabase = async (req, res, next) => {
    try {
        const { filePath } = req.body; // Path file yang diterima dari frontend

        if (!filePath) {
            return res.status(400).json({
                message: "Parameter 'filePath' tidak boleh kosong."
            });
        }

        const bucketName = 'mira'; // Sesuaikan dengan nama bucket Anda di Supabase

        // --- Perbaikan pada bagian ini ---
        // Cari posisi nama bucket dalam URL
        const bucketIndex = filePath.indexOf(`/${bucketName}/`);
        let pathInBucket;

        if (bucketIndex !== -1) {
            // Jika ditemukan, ambil string setelah "/bucketName/"
            pathInBucket = filePath.substring(bucketIndex + `/${bucketName}/`.length);
        } else {
            // Fallback atau handle jika format URL tidak sesuai ekspektasi
            // Ini bisa terjadi jika filePath hanya berupa path relatif dari bucket, bukan URL lengkap
            pathInBucket = filePath; // Asumsi filePath sudah pathInBucket jika tidak ada URL lengkap
            console.warn("Peringatan: filePath tidak mengandung '/bucketName/'. Mengasumsikan filePath adalah pathInBucket.");
        }
        // --- Akhir Perbaikan ---


        console.log("Menghapus file dari Supabase Storage:", pathInBucket); // Debugging
        console.log("Bucket Name:", bucketName); // Debugging

        const { data, error } = await supabase.storage
            .from(bucketName)
            .remove([pathInBucket]);

        if (error) {
            console.error("Error menghapus gambar dari Supabase:", error);
            if (error.statusCode === '404' || error.message.includes('not found')) {
                 return res.status(404).json({
                     message: "File gambar tidak ditemukan di Supabase Storage.",
                     error: error.message
                 });
            }
            return res.status(500).json({
                message: "Gagal menghapus gambar dari Supabase.",
                error: error.message
            });
        }

        return res.status(200).json({
            message: "Gambar berhasil dihapus dari Supabase.",
            data: data,
        });

    } catch (error) {
        console.error("Kesalahan tak terduga saat menghapus gambar:", error);
        return next(error);
    }
};



module.exports = {
    addMatakuliah,
    createKelas,
    addMahasiswa,
    getmatakuliah,
    getKelasByDosen,
    getMahasiswaByKelas,
    uploudGambar,
    removeMahasiswa,
    deleteImageFromSupabase,
};