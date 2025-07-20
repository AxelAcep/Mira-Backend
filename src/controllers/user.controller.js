const { PrismaClient } = require("@prisma/client");
const ClientError = require("../errors/ClientError");
const passport = require("passport");
const { get } = require("http");
const prisma = new PrismaClient();
const supabase = require("../dataStorage");
const axios = require("axios");

const deleteMahasiswa = async (req, res, next) => {
  try {
    const { nim } = req.body;

    // 1. Validasi input
    if (!nim) {
      return res.status(400).json({ message: "NIM is required." });
    }

    // 2. Cek apakah mahasiswa dengan NIM tersebut ada
    const existingMahasiswa = await prisma.mahasiswa.findUnique({
      where: { nim: nim },
    });

    if (!existingMahasiswa) {
      return res.status(404).json({ message: `Mahasiswa with NIM ${nim} not found.` });
    }

    // 3. Hapus data terkait secara transaksional
    // Menggunakan $transaction untuk memastikan semua operasi berhasil atau tidak sama sekali (atomicity)
    const result = await prisma.$transaction(async (tx) => {
      // Hapus semua entri di tabel Kehadiran yang terkait dengan mahasiswa ini
      await tx.kehadiran.deleteMany({
        where: { nim: nim },
      });

      // Hapus semua entri di tabel KelasMahasiswa yang terkait dengan mahasiswa ini
      await tx.kelasMahasiswa.deleteMany({
        where: { kodeMahasiswa: nim },
      });

      // Akhirnya, hapus data mahasiswa itu sendiri
      const deletedMahasiswa = await tx.mahasiswa.delete({
        where: { nim: nim },
      });

      return deletedMahasiswa;
    });

    res.status(200).json({
      message: `Mahasiswa with NIM ${nim} and all related data deleted successfully.`,
      data: result,
    });

  } catch (error) {
    console.error("Error deleting mahasiswa:", error);
    // Tangani error spesifik dari Prisma jika diperlukan
    if (error.code === 'P2025') { // Code for record not found (though we check it manually above)
        return res.status(404).json({ message: "Record to delete does not exist." });
    }
    return next(error); // Lanjutkan ke middleware error handling berikutnya
  } finally {
    await prisma.$disconnect(); // Pastikan koneksi Prisma ditutup
  }
};

const editMahasiswa = async (req, res, next) => {
  try {
    console.log("Test: editMahasiswa function called");
    const { nim, nama, prodi } = req.body; // linkFirebase dihapus

    // Pastikan NIM disediakan dalam body request
    if (!nim) {
      const error = new Error("NIM is required to edit a student.");
      error.statusCode = 400;
      return next(error);
    }

    // Periksa apakah mahasiswa dengan NIM tersebut ada
    const existingMahasiswa = await prisma.mahasiswa.findUnique({
      where: {
        nim: nim,
      },
    });

    if (!existingMahasiswa) {
      const error = new Error(`Mahasiswa with NIM ${nim} not found.`);
      error.statusCode = 404;
      return next(error);
    }

    // Siapkan data untuk pembaruan, hanya sertakan kolom yang disediakan dan valid
    const updateData = {};
    if (nama !== undefined) {
      updateData.nama = nama;
    }
    if (prodi !== undefined) {
      // Validasi prodi terhadap enum
      const validProdi = ["S1_Informatika", "S1_Sistem_Informasi", "D3_Sistem_Informasi"];
      if (!validProdi.includes(prodi)) {
        const error = new Error("Invalid Prodi value.");
        error.statusCode = 400;
        return next(error);
      }
      updateData.prodi = prodi;
    }

    // Jika tidak ada kolom yang valid untuk diperbarui
    if (Object.keys(updateData).length === 0) {
      const error = new Error("No valid fields provided for update (nama or prodi).");
      error.statusCode = 400;
      return next(error);
    }

    // Lakukan pembaruan data mahasiswa di database
    const updatedMahasiswa = await prisma.mahasiswa.update({
      where: {
        nim: nim,
      },
      data: updateData,
    });

    // Kirim respons sukses
    res.status(200).json({
      message: "Mahasiswa updated successfully",
      mahasiswa: updatedMahasiswa,
    });

  } catch (error) {
    console.error("Error in editMahasiswa:", error);
    // Penanganan error spesifik Prisma
    if (error.code === 'P2025') { // Prisma error code for record not found
      error.statusCode = 404;
      error.message = `Mahasiswa with NIM ${req.body.nim} not found.`;
    } else if (!error.statusCode) {
      error.statusCode = 500; // Default ke 500 jika tidak ada status code spesifik
    }
    return next(error);
  } finally {
    // Pastikan koneksi Prisma terputus
    await prisma.$disconnect();
  }
};
const trainMahasiswa = async (req, res, next) => {
  try {
    const { nim } = req.body;

    if (!nim) {
      return res.status(400).json({ message: "NIM tidak boleh kosong." });
    }

    // Kirim POST request ke FastAPI
    const response = await axios.post("http://localhost:8000/encode", {
      nim: nim,
    });

    // Kembalikan hasil response dari FastAPI ke frontend
    return res.status(200).json({
      message: response.data.message,
      encoded_faces: response.data.encoded_faces,
      uploaded_to_supabase: response.data.uploaded_to_supabase,
      supabase_output_path: response.data.supabase_output_path,
    });
  } catch (error) {
    // Jika ada error dari FastAPI
    if (error.response) {
      return res.status(error.response.status).json({
        message:
          error.response.data.detail ||
          "Terjadi kesalahan pada backend Python.",
      });
    }

    return next(error);
  }
};

const getDosenByNidn = async (req, res, next) => {
  try {
    const nidn = req.dosen.nidn; // ini sesuai dengan JWT payload dan middleware

    const dosen = await prisma.dosen.findUnique({
      where: {
        nidn,
      },
    });

    return res.status(200).json({
      message: "Success",
      data: dosen,
    });
  } catch (error) {
    return next(error);
  }
};

const getDetailDosen = async (req, res, next) => {
  try {
    const { nidn } = req.params;

    const dosen = await prisma.dosen.findUnique({
      where: {
        nidn,
      },
    });
    return res.status(200).json({
      message: "Success",
      data: dosen,
    });
  } catch (error) {
    return next(error);
  }
};

const getAllDosen = async (req, res, next) => {
  try {
    const dosen = await prisma.dosen.findMany();

    return res.status(200).json({
      message: "Success",
      data: dosen,
    });
  } catch (error) {
    return next(error);
  }
};

const getMahasiswaByNim = async (req, res, next) => {
  try {
    const nim = req.params.nim;

    // Ambil data mahasiswa dari database
    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { nim },
    });

    if (!mahasiswa) {
      return res.status(404).json({ message: "Mahasiswa tidak ditemukan" });
    }

    const folderPath = mahasiswa.linkFirebase; // Contoh: "mahasiswa/Axel/"

    // Ambil daftar file dalam folder tersebut
    const { data: files, error } = await supabase.storage
      .from("mira")
      .list(folderPath);

    if (error) {
      return res.status(500).json({
        message: "Gagal mengambil file dari Supabase",
        error: error.message,
      });
    }

    // Buat URL publik untuk setiap file
    const fileUrls = files.map((file) => {
      return {
        name: file.name,
        url: `${process.env.SUPABASE_URL}/storage/v1/object/public/mira/${folderPath}${file.name}`,
      };
    });

    return res.status(200).json({
      message: "Success",
      data: {
        mahasiswa,
        files: fileUrls, // ini semua file dalam folder mahasiswa/Axel/
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getAllMahasiswa = async (req, res, next) => {
  try {
    const mahasiswa = await prisma.mahasiswa.findMany();

    return res.status(200).json({
      message: "Success",
      data: mahasiswa,
    });
  } catch (error) {
    return next(error);
  }
};

const loginDosen = async (req, res, next) => {
  passport.authenticate("local", (err, data, info) => {
    if (err) return next(err);
    if (!data) {
      return res.status(401).json({ message: info.message || "Login failed" });
    }

    const { dosen, token } = data;

    if (dosen.nidn == "00000") {
      res.json({
        message: "Admin Mode",
        token,
        dosen: {
          nidn: dosen.nidn,
          nama: dosen.nama, // opsional, jika ingin tampilkan nama
          fotoProfil: dosen.fotoProfil, // opsional, jika ingin tampilkan prodi
        },
      });
    } else {
      res.json({
        message: "Login successful",
        token,
        dosen: {
          nidn: dosen.nidn,
          nama: dosen.nama, // opsional, jika ingin tampilkan nama
          fotoProfil: dosen.fotoProfil, // opsional, jika ingin tampilkan prodi
        },
      });
    }
  })(req, res, next);
};

const logout = async (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
};

const createDosen = async (req, res, next) => {
  try {
    const {
      nidn,
      nama,
      email,
      password,
      fotoProfil,
      jabatanFungsional,
      prodi,
      kompetensi,
    } = req.body;

    const existing = await prisma.dosen.findUnique({
      where: { nidn },
    });

    if (existing) {
      return res.status(400).json({ message: "Dosen Sudah Didaftarkan." });
    }

    const dosen = await prisma.dosen.create({
      data: {
        nidn,
        nama,
        email,
        password,
        fotoProfil,
        jabatanFungsional,
        prodi,
        kompetensi,
      },
    });
    return res.status(201).json({
      message: "Mahasiswa Berhasil Ditambahkan",
      data: dosen,
    });
  } catch (error) {
    return next(error);
  }
};

const createMahasiswa = async (req, res, next) => {
  try {
    const { nim, nama, prodi } = req.body;

    // 1. Cek apakah mahasiswa sudah terdaftar
    const existing = await prisma.mahasiswa.findUnique({
      where: { nim },
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "Mahasiswa sudah pernah didaftarkan." });
    }

    // 2. Buat folder kosong di Supabase
    const folderPath = `mahasiswa/${nim}/.init.txt`; // .init.txt sebagai dummy agar folder tercipta
    const dummyFile = Buffer.from("initial file");

    const { error: uploadError } = await supabase.storage
      .from("mira") // gunakan nama bucket kamu
      .upload(folderPath, dummyFile, {
        contentType: "text/plain",
        upsert: true,
      });

    if (uploadError) {
      return res.status(500).json({
        message: "Gagal membuat folder di Supabase",
        error: uploadError.message,
      });
    }

    // 3. Dapatkan URL folder
    const folderUrl = `mahasiswa/${nim}/`; // Tanpa .init.txt

    // 4. Simpan ke database
    const mahasiswa = await prisma.mahasiswa.create({
      data: {
        nim,
        nama,
        prodi,
        linkFirebase: folderUrl,
      },
    });

    return res.status(201).json({
      message: "Mahasiswa Berhasil Ditambahkan",
      data: mahasiswa,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteDosen = async (req, res, next) => {
  try {
    const { nidn } = req.body; // Assuming NIDN is sent in the request body for deletion

    if (!nidn) {
      return res.status(400).json({ message: "NIDN is required for deleting a Dosen." });
    }

    // 1. Find all Kelas associated with this Dosen
    const kelasToDosen = await prisma.kelas.findMany({
      where: {
        nidn: nidn,
      },
      select: {
        kodeKelas: true, // We need kodeKelas to delete related records
      },
    });

    // Extract all kodeKelas associated with the Dosen
    const kodeKelasList = kelasToDosen.map(kelas => kelas.kodeKelas);

    // 2. Delete related records in a specific order:
    //    a. Delete Kehadiran records associated with Recap records in these Kelas
    //    b. Delete Recap records associated with these Kelas
    //    c. Delete KelasMahasiswa records associated with these Kelas
    //    d. Delete Kelas records themselves
    //
    //    Note: The order matters. You cannot delete a parent record if child records still reference it.
    //    You might need to adjust this order or add more steps if you have other relationships.

    // Using a transaction to ensure atomicity: either all deletions succeed or none do.
    await prisma.$transaction(async (tx) => {
      if (kodeKelasList.length > 0) {
        // Find all Recap codes related to these Classes to delete Kehadiran
        const recapsInKelas = await tx.recap.findMany({
          where: {
            kodeKelas: { in: kodeKelasList },
          },
          select: {
            kodeRecap: true,
          },
        });
        const kodeRecapList = recapsInKelas.map(recap => recap.kodeRecap);

        if (kodeRecapList.length > 0) {
          // Delete Kehadiran records first
          await tx.kehadiran.deleteMany({
            where: {
              kodeRecap: { in: kodeRecapList },
            },
          });
          console.log(`Deleted ${kodeRecapList.length} Kehadiran records.`);
        }

        // Delete Recap records
        await tx.recap.deleteMany({
          where: {
            kodeKelas: { in: kodeKelasList },
          },
        });
        console.log(`Deleted ${kodeKelasList.length} Recap records.`);

        // Delete KelasMahasiswa records
        await tx.kelasMahasiswa.deleteMany({
          where: {
            kodeKelas: { in: kodeKelasList },
          },
        });
        console.log(`Deleted KelasMahasiswa records for ${kodeKelasList.length} classes.`);

        // Finally, delete the Kelas records themselves
        await tx.kelas.deleteMany({
          where: {
            nidn: nidn,
          },
        });
        console.log(`Deleted ${kodeKelasList.length} Kelas records associated with Dosen ${nidn}.`);
      }

      // 3. Delete the Dosen record
      const deletedDosen = await tx.dosen.delete({
        where: {
          nidn: nidn,
        },
      });

      console.log(`Dosen with NIDN ${nidn} deleted successfully.`);
      return res.status(200).json({
        message: "Dosen and associated data deleted successfully.",
        dosen: deletedDosen,
      });
    });

  } catch (error) {
    // Check if the error is a Prisma KnownRequestError (e.g., if Dosen not found)
    if (error.code === 'P2025') { // Prisma's record not found error
      return res.status(404).json({ message: `Dosen with NIDN ${req.body.nidn} not found.` });
    }
    console.error("Error deleting Dosen:", error);
    return next(error); // Pass error to the next error handling middleware
  } finally {
    await prisma.$disconnect(); // Disconnect Prisma client after operation
  }
};

  const editDosen = async (req, res, next) => {
    const {
      nidn,
      nama,
      email,
      fotoProfil,
      jabatanFungsional,
      prodi,
      kompetensi,
    } = req.body;

    if (!nidn) {
      return res.status(400).json({ message: 'NIDN wajib disertakan.' });
    }

    try {
      const dosen = await prisma.dosen.update({
        where: { nidn },
        data: {
          nama,
          email,
          fotoProfil,
          jabatanFungsional,
          prodi,
          kompetensi,
        },
      });

      return res.status(200).json({ message: 'Data dosen berhasil diperbarui.', dosen });
    } catch (error) {
      console.error('Gagal memperbarui dosen:', error);
      return res.status(500).json({ message: 'Gagal memperbarui data dosen.', error });
    }
  };

module.exports = {
  getDosenByNidn,
  getAllMahasiswa,
  loginDosen,
  logout,
  createMahasiswa,
  getMahasiswaByNim,
  getAllDosen,
  createDosen,
  getDetailDosen,
  trainMahasiswa,
  editMahasiswa,
  deleteMahasiswa,
  deleteDosen,
  editDosen
};
