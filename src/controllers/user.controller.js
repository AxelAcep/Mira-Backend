const { PrismaClient } = require("@prisma/client");
const ClientError = require("../errors/ClientError");
const passport = require("passport");
const { get } = require("http");
const prisma = new PrismaClient();
const supabase = require("../dataStorage");

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
    const folderUrl = `mahasiswa/${nama}/`; // Tanpa .init.txt

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
};
