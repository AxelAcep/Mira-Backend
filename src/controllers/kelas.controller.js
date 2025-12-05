const { PrismaClient } = require("@prisma/client");
const ClientError = require("../errors/ClientError");
const passport = require("passport");
const { get } = require("http");
const prisma = new PrismaClient();
const supabase = require("../dataStorage");
const axios = require("axios");


const downloadModel = async (req, res, next) => {
    try {
        const { kodeKelas } = req.body;

        if (!kodeKelas) {
            return res.status(400).json({ message: 'kodeKelas is required.' });
        }

        const bucketName = 'mira'; // Assuming your bucket name is 'mira' based on your previous description
        const folderPath = 'mahasiswa/model';
        const fileName = `${kodeKelas}.dat`; // Assuming the file name *is* the kodeKelas, e.g., 'model_A123'

        // Construct the full path to the file in Supabase Storage
        const filePath = `${folderPath}/${fileName}`;

        // Get the public URL for the file.
        // For downloading, it's often better to use the signed URL or stream directly if the file isn't public.
        // For simplicity, let's assume direct download via `createReadStream`.

        // Fetch the file as a Blob (Binary Large Object)
        const { data, error } = await supabase.storage
            .from(bucketName)
            .download(filePath);

        if (error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({ message: `Model with kodeKelas ${kodeKelas} not found.` });
            }
            console.error('Error downloading from Supabase:', error);
            return next(error);
        }

        if (!data) {
             return res.status(404).json({ message: `Model with kodeKelas ${kodeKelas} not found or empty.` });
        }

        // Convert the Blob to a Buffer to send as a response
        const buffer = Buffer.from(await data.arrayBuffer());

        // Set the appropriate headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', data.type || 'application/octet-stream'); // Use Blob's type or generic binary

        // Send the file buffer
        res.send(buffer);

        console.log(`Model ${fileName} downloaded successfully.`);

    } catch (error) {
        console.error('Error in useModel:', error);
        return next(error);
    }
};

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
};

const createKelas = async (req, res, next) => {
    try {
        const { kodeMatakuliah, ruangan, jadwal } = req.body;
        const nidn = req.dosen.nidn;

        // Generate random 3 letters + 5 digits
        const generateKodeKelas = () => {
            const letters = Math.random()
                .toString(36)
                .substring(2, 5)
                .toUpperCase(); // 3 huruf
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

const createKelasAdmin = async (req, res, next) => {
    try {
        const { kodeMatakuliah, ruangan, jadwal, nidn } = req.body;

        // ✅ VALIDASI NIDN PADA MULAI
        if (!nidn) {
            return res.status(400).json({
                message: "NIDN wajib diisi!"
            });
        }

        // ✅ CEK NIDN APAKAH ADA DI DATABASE
        const dosen = await prisma.dosen.findUnique({
            where: {
                nidn: nidn
            }
        });

        if (!dosen) {
            return res.status(401).json({
                message: "NIDN dosen tidak ditemukan!",
                error: "unauthorized_nidn"
            });
        }

        // Generate random 3 letters + 5 digits
        const generateKodeKelas = () => {
            const letters = Math.random()
                .toString(36)
                .substring(2, 5)
                .toUpperCase(); // 3 huruf
            const numbers = Math.floor(10000 + Math.random() * 90000); // 5 angka
            return `${letters}${numbers}`;
        };

        const KodeKelas = generateKodeKelas();

        // ✅ CEK MATAKULIAH JUGA
        const matakuliah = await prisma.matakuliah.findUnique({
            where: {
                kodeMatakuliah: kodeMatakuliah
            }
        });

        if (!matakuliah) {
            return res.status(400).json({
                message: "Kode Matakuliah tidak ditemukan!",
                error: "invalid_matakuliah"
            });
        }

        const kelas = await prisma.kelas.create({
            data: {
                kodeKelas: KodeKelas,
                kodeMatakuliah,
                nidn,
                jadwal,
                ruangan,
            },
            include: {
                matakuliah: true,
                dosen: true
            }
        });

        return res.status(201).json({
            message: "Kelas Berhasil Dibuat!",
            data: kelas,
        });

    } catch (error) {
        console.error("Error create kelas:", error);
        
        // ✅ HANDLE PRISMA VALIDATION ERROR
        if (error.code === 'P2002') {
            return res.status(400).json({
                message: "Data kelas dengan kombinasi tersebut sudah ada!",
                error: "duplicate_data"
            });
        }

        // ✅ HANDLE PRISMA CONNECTION ERROR
        if (error.code === 'P1001' || error.code === 'P1017') {
            return res.status(500).json({
                message: "Koneksi database gagal. Coba lagi nanti.",
                error: "database_connection"
            });
        }

        return next(error);
    }
};



const getKelasById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const kelas = await prisma.kelas.findUnique({
            where: {
                kodeKelas: id,
            },  
        });

        if (!kelas) {
            return res.status(404).json({
                message: `Kelas dengan kodeKelas ${id} tidak ditemukan.`,
            });
        }
        return res.status(200).json({
            message: "Success",
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
};

const getKelasByDosen = async (req, res, next) => {
    try {
        const nidn = req.dosen.nidn;

        const kelas = await prisma.kelas.findMany({
            where: {
                nidn,
            },
            include: {
                matakuliah: {
                    // Assuming 'matakuliah' is the relation field name in your Kelas model
                    select: {
                        namaMatakuliah: true, // Select only the course name
                    },
                },
            },
        });

        // Map the results to include the course name directly in each class object
        const kelasWithNamaMatakuliah = kelas.map((k) => ({
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
};

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
};

const getAllKelas = async (req, res, next) => {
    try {
        const kelas = await prisma.kelas.findMany({
            include: {
                matakuliah: {
                    // Assuming 'matakuliah' is the relation field name in your Kelas model
                    select: {
                        namaMatakuliah: true, // Select only the course name
                    },
                },
            },
        });

        return res.status(200).json({
            message: "Success",
            data: kelas,
        });
    } catch (error) {
        return next(error);
    }
};

const addMahasiswa = async (req, res, next) => {
    try {
        const { kodeMahasiswa, kodeKelas } = req.body;

        // 1. Periksa apakah Mahasiswa dengan kodeMahasiswa tersebut ada
        const mahasiswaExists = await prisma.mahasiswa.findUnique({
            where: {
                nim: kodeMahasiswa, // Asumsi 'nim' adalah primary key atau unique field untuk mahasiswa
            },
        });

        if (!mahasiswaExists) {
            return res.status(404).json({
                // Menggunakan status 404 (Not Found) lebih tepat
                message: "Mahasiswa tidak ditemukan",
            });
        }

        // 2. Periksa apakah Mahasiswa sudah terdaftar di Kelas ini
        const existingKelasMahasiswa = await prisma.kelasMahasiswa.findFirst({
            where: {
                kodeMahasiswa,
                kodeKelas,
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
};

const uploudGambar = async (req, res, next) => {
    try {
        const { nim } = req.body;
        const files = req.files; // <-- Perubahan utama: Sekarang req.files (plural)

        if (!files || files.length === 0) {
            return res
                .status(400)
                .json({ message: "Tidak ada file yang ditemukan." });
        }

        const mahasiswa = await prisma.mahasiswa.findUnique({
            where: {
                nim: nim,
            },
            select: {
                // Hanya ambil field yang dibutuhkan
                nama: true,
                nim: true
                // linkFirebase: true, // Jika masih ingin pakai linkFirebase
            },
        });

        if (!mahasiswa) {
            return res
                .status(404)
                .json({ message: "Mahasiswa tidak ditemukan." });
        }

        const namaMahasiswa = mahasiswa.nim;
        const bucketName = "mira";
        const uploadedFileDetails = []; // Untuk menyimpan detail setiap file yang berhasil diunggah

        // Loop melalui setiap file yang diterima
        for (const file of files) {
            // Iterasi setiap file dalam array req.files
            const uploadPath = `mahasiswa/${namaMahasiswa}/${file.originalname}`; // Path untuk Supabase

            console.log(
                `Mengunggah file: ${file.originalname} ke ${uploadPath} di bucket: ${bucketName}`,
            );

            const { error: uploadError } = await supabase.storage
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
                console.error(
                    `Gagal mengunggah file ${file.originalname}:`,
                    uploadError,
                );
                return res.status(500).json({
                    message: `Gagal mengunggah beberapa gambar. Kegagalan pada file: ${file.originalname}.`,
                    error: uploadError.message,
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
                kodeKelas_kodeMahasiswa: {
                    // This is the composite unique key
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
        if (error.code === "P2025") {
            return res.status(404).json({
                message: "Mahasiswa tidak ditemukan di kelas ini.",
                error: error.message,
            });
        }
        return next(error);
    }
};

const deleteImageFromSupabase = async (req, res, next) => {
    try {
        const { filePath } = req.body; // Path file yang diterima dari frontend

        if (!filePath) {
            return res.status(400).json({
                message: "Parameter 'filePath' tidak boleh kosong.",
            });
        }

        const bucketName = "mira"; // Sesuaikan dengan nama bucket Anda di Supabase

        // --- Perbaikan pada bagian ini ---
        // Cari posisi nama bucket dalam URL
        const bucketIndex = filePath.indexOf(`/${bucketName}/`);
        let pathInBucket;

        if (bucketIndex !== -1) {
            // Jika ditemukan, ambil string setelah "/bucketName/"
            pathInBucket = filePath.substring(
                bucketIndex + `/${bucketName}/`.length,
            );
        } else {
            // Fallback atau handle jika format URL tidak sesuai ekspektasi
            // Ini bisa terjadi jika filePath hanya berupa path relatif dari bucket, bukan URL lengkap
            pathInBucket = filePath; // Asumsi filePath sudah pathInBucket jika tidak ada URL lengkap
            console.warn(
                "Peringatan: filePath tidak mengandung '/bucketName/'. Mengasumsikan filePath adalah pathInBucket.",
            );
        }
        // --- Akhir Perbaikan ---

        console.log("Menghapus file dari Supabase Storage:", pathInBucket); // Debugging
        console.log("Bucket Name:", bucketName); // Debugging

        const { data, error } = await supabase.storage
            .from(bucketName)
            .remove([pathInBucket]);

        if (error) {
            console.error("Error menghapus gambar dari Supabase:", error);
            if (
                error.statusCode === "404" ||
                error.message.includes("not found")
            ) {
                return res.status(404).json({
                    message: "File gambar tidak ditemukan di Supabase Storage.",
                    error: error.message,
                });
            }
            return res.status(500).json({
                message: "Gagal menghapus gambar dari Supabase.",
                error: error.message,
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

const mergeEncodings = async (req, res, next) => {
    try {
        const { kodeKelas } = req.body;

        if (!kodeKelas) {
            return res.status(400).json({
                message: "kodeKelas wajib diisi.",
            });
        }

        // 1. Fetch nim_list from the database using kodeKelas
        const kelasMahasiswa = await prisma.kelasMahasiswa.findMany({
            where: {
                kodeKelas: kodeKelas,
            },
            select: {
                kodeMahasiswa: true, // We only need the nim (kodeMahasiswa)
            },
        });

        // Extract nims into a simple array
        const nim_list = kelasMahasiswa.map(km => km.kodeMahasiswa);

        // Optional: Check if nim_list is empty after fetching from DB
        if (nim_list.length === 0) {
            return res.status(404).json({
                message: "Tidak ada mahasiswa ditemukan untuk kodeKelas ini.",
            });
        }

        const response = await axios.post(
            "http://localhost:8000/merge-encodings",
            {
                kodeKelas,
                nim_list, // Now nim_list comes from the database
            },
        );

        return res.status(200).json({
            message: response.data.message,
            total_encoded_faces: response.data.total_encoded_faces,
            nims_processed: response.data.nims_processed,
            nims_failed: response.data.nims_failed,
            uploaded_to_supabase_model:
                response.data.uploaded_to_supabase_model,
            supabase_combined_file_path_model:
                response.data.supabase_combined_file_path_model,
        });
    } catch (error) {
        if (error.response) {
            // Log the actual error response from the Python backend for debugging
            console.error("Error from Python backend:", error.response.data); 
            return res.status(error.response.status).json({
                message:
                    error.response.data.detail ||
                    "Terjadi kesalahan saat menggabungkan encoding di backend Python.",
            });
        }

        // Log the full error object for better debugging
        console.error("Unexpected error in mergeEncodings:", error);
        return next(error);
    }
};

const deleteKelas = async (req, res, next) => {
    try {
        const { kodeKelas } = req.body;

        console.log(kodeKelas);

        if (!kodeKelas) {
            return res.status(400).json({
                message: "kodeKelas wajib diisi.",
            });
        }

        // Check if the class exists
        const existingKelas = await prisma.kelas.findUnique({
            where: { kodeKelas: kodeKelas },
        });

        if (!existingKelas) {
            return res.status(404).json({
                message: `Kelas dengan kodeKelas ${kodeKelas} tidak ditemukan.`,
            });
        }

        // --- Manual Cascade Deletion Order ---

        // 1. Delete Kehadiran records associated with Recaps of this Kelas
        //    First, find all Recaps related to this Kelas
        const recapsToDelete = await prisma.recap.findMany({
            where: { kodeKelas: kodeKelas },
            select: { kodeRecap: true } // Only select the kodeRecap
        });

        const recapKodes = recapsToDelete.map(recap => recap.kodeRecap);

        if (recapKodes.length > 0) {
            await prisma.kehadiran.deleteMany({
                where: {
                    kodeRecap: {
                        in: recapKodes // Delete all Kehadiran where kodeRecap is in the list of recaps related to this class
                    }
                }
            });
            console.log(`Deleted ${recapKodes.length} Kehadiran records for class ${kodeKelas}`);
        }

        // 2. Delete Recap records associated with this Kelas
        await prisma.recap.deleteMany({
            where: { kodeKelas: kodeKelas },
        });
        console.log(`Deleted Recap records for class ${kodeKelas}`);

        // 3. Delete KelasMahasiswa records associated with this Kelas
        await prisma.kelasMahasiswa.deleteMany({
            where: { kodeKelas: kodeKelas },
        });
        console.log(`Deleted KelasMahasiswa records for class ${kodeKelas}`);


        // 4. Finally, delete the Kelas record itself
        await prisma.kelas.delete({
            where: { kodeKelas: kodeKelas },
        });
        console.log(`Deleted Kelas ${kodeKelas}`);

        return res.status(200).json({
            message: `Kelas dengan kodeKelas ${kodeKelas} dan seluruh data terkait berhasil dihapus.`,
        });

    } catch (error) {
        console.error("Error deleting class:", error);
        // Pass the error to the next middleware (if you have an error handling middleware)
        return next(error);
    } finally {
        await prisma.$disconnect(); // Disconnect Prisma client after operation
    }
};

const editKelas = async (req, res, next) => {
  try {
    const { kodeMk, kodeKelas, ruangan, waktu } = req.body;

    // First, check if the class exists
    const existingKelas = await prisma.kelas.findUnique({
      where: {
        kodeKelas: kodeKelas,
      },
    });

    if (!existingKelas) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    // Prepare data for update. Only include fields that are provided in the request body.
    const updateData = {};
    if (kodeMk) {
      // Validate if kodeMk (kodeMatakuliah) exists in Matakuliah table
      const matakuliahExists = await prisma.matakuliah.findUnique({
        where: { kodeMatakuliah: kodeMk },
      });
      if (!matakuliahExists) {
        return res.status(400).json({ message: 'Invalid Matakuliah Code.' });
      }
      updateData.kodeMatakuliah = kodeMk;
    }
    if (ruangan) {
      updateData.ruangan = ruangan;
    }
    if (waktu) { // Assuming 'waktu' corresponds to 'jadwal' in your Prisma model
      updateData.jadwal = waktu;
    }

    // Perform the update operation
    const updatedKelas = await prisma.kelas.update({
      where: {
        kodeKelas: kodeKelas,
      },
      data: updateData,
      include: { // Optionally include related data in the response
        matakuliah: true,
        dosen: true,
      },
    });

    res.status(200).json({
      message: 'Class updated successfully',
      data: updatedKelas,
    });

  } catch (error) {
    console.error('Error updating class:', error);
    return next(error);
  }
};

const editKelasAdmin = async (req, res, next) => {
  try {
    const { kodeMk, kodeKelas, ruangan, waktu, nidn } = req.body;

    // First, check if the class exists
    const existingKelas = await prisma.kelas.findUnique({
      where: {
        kodeKelas: kodeKelas,
      },
    });

    if (!existingKelas) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    const dosen = await prisma.dosen.findUnique({
        where: {
            nidn: nidn
        }
    });

    if (!dosen) {
        return res.status(401).json({
            message: "NIDN dosen tidak ditemukan!",
            error: "unauthorized_nidn"
        });
    }

    // Prepare data for update. Only include fields that are provided in the request body.
    const updateData = {};
    if (kodeMk) {
      // Validate if kodeMk (kodeMatakuliah) exists in Matakuliah table
      const matakuliahExists = await prisma.matakuliah.findUnique({
        where: { kodeMatakuliah: kodeMk },
      });
      if (!matakuliahExists) {
        return res.status(400).json({ message: 'Invalid Matakuliah Code.' });
      }
      updateData.kodeMatakuliah = kodeMk;
    }
    if (ruangan) {
      updateData.ruangan = ruangan;
    }
    if (waktu) { // Assuming 'waktu' corresponds to 'jadwal' in your Prisma model
      updateData.jadwal = waktu;
    }
    if (waktu) { // Assuming 'waktu' corresponds to 'jadwal' in your Prisma model
      updateData.nidn = nidn;
    }

    // Perform the update operation
    const updatedKelas = await prisma.kelas.update({
      where: {
        kodeKelas: kodeKelas,
      },
      data: updateData,
      include: { // Optionally include related data in the response
        matakuliah: true,
        dosen: true,
      },
    });

    res.status(200).json({
      message: 'Class updated successfully',
      data: updatedKelas,
    });

  } catch (error) {
    console.error('Error updating class:', error);
    return next(error);
  }
};


const getMatakuliah = async (req, res, next) => {
    try {
        // 1. Ambil kodematakuliah dari parameter URL
        const { kodematakuliah } = req.params; 

        // 2. Gunakan findUnique() dengan objek 'where'
        const matakuliah = await prisma.matakuliah.findUnique({
            where: {
                // Pastikan 'kodematakuliah' adalah field kunci di model Prisma Anda
                kodeMatakuliah: kodematakuliah, 
            },
        });

        // 3. Cek jika mata kuliah tidak ditemukan
        if (!matakuliah) {
            return res.status(404).json({
                message: "Mata kuliah tidak ditemukan",
                data: null,
            });
        }

        // 4. Kirim respons sukses
        return res.status(200).json({
            message: "Success",
            data: matakuliah,
        });
        
    } catch (error) {
        // Penanganan error
        return next(error);
    }
};

const editMatakuliah = async (req, res, next) => {
    try {
        const { kodeMatakuliah, namaMatakuliah, sks } = req.body;
        const updatedMatakuliah = await prisma.matakuliah.update({
            where: {
                kodeMatakuliah: kodeMatakuliah, 
            },
            data: {
                namaMatakuliah: namaMatakuliah,
                sks: sks,
            },
        });
        return res.status(200).json({
            message: "Matakuliah Berhasil Diedit",
            data: updatedMatakuliah,
        });
    } catch (error) {
        return next(error);
    }};

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
    getAllKelas,
    mergeEncodings,
    downloadModel,
    deleteKelas,
    editKelas,
    getKelasById,
    createKelasAdmin,
    editKelasAdmin,
    editMatakuliah,
    getMatakuliah,
};
