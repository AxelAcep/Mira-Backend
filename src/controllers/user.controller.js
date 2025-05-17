const { PrismaClient } = require("@prisma/client");
const ClientError = require("../errors/ClientError");
const passport = require('passport');
const { get } = require("http");
const prisma = new PrismaClient();
const supabase = require('../dataStorage'); 

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
}

const loginDosen = async (req, res, next) => {
  passport.authenticate('local', (err, data, info) => {
    if (err) return next(err);
    if (!data) {
      return res.status(401).json({ message: info.message || 'Login failed' });
    }

    const { dosen, token } = data;

    res.json({
      message: 'Login successful',
      token,
      dosen: {
        nidn: dosen.nidn,
        nama: dosen.nama, // opsional, jika ingin tampilkan nama
      },
    });
  })(req, res, next);
};

const logout = async (req, res) => {
  res.status(200).json({ message: 'Logged out successfully' });
};

const createMahasiswa = async (req, res, next) => {
  try {
    const { nim, nama, prodi } = req.body;

    // 1. Cek apakah mahasiswa sudah terdaftar
    const existing = await prisma.mahasiswa.findUnique({
      where: { nim },
    });

    if (existing) {
      return res.status(400).json({ message: "Mahasiswa sudah pernah didaftarkan." });
    }

    // 2. Buat folder kosong di Supabase
    const folderPath = `mahasiswa/${nama}/.init.txt`; // .init.txt sebagai dummy agar folder tercipta
    const dummyFile = Buffer.from('initial file');

    const { error: uploadError } = await supabase
      .storage
      .from('mira') // gunakan nama bucket kamu
      .upload(folderPath, dummyFile, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      return res.status(500).json({ message: "Gagal membuat folder di Supabase", error: uploadError.message });
    }

    // 3. Dapatkan URL folder
    const folderUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/mira/mahasiswa/${encodeURIComponent(nama)}/`;

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
};