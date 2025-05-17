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
    const { kodeMatakuliah, jadwal } = req.body;
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
        });
    
        return res.status(200).json({
            message: "Success",
            data: kelas,
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
    
        const existing = await prisma.kelasMahasiswa.findFirst({
            where: {
                kodeMahasiswa,
                kodeKelas
            },
            });

        if (existing) {
            return res.status(400).json({
                message: "Mahasiswa sudah terdaftar",
            });
        }
    
        const daftarMahasiswa = await prisma.kelasMahasiswa.create({
            data: {
                kodeMahasiswa,
                kodeKelas,
            },
        });
    
        return res.status(201).json({
            message: "Mahasiswa Berhasil Ditambahkan",
            data: daftarMahasiswa,
        });
    } catch (error) {
        return next(error);
    }
}

const uploudGambar = async (req, res, next) => {
try {
    const { nim } = req.body;
    const file = req.file;

    if (!file) {
    return res.status(400).json({ message: "File tidak ditemukan" });
    }

    const mahasiswa = await prisma.mahasiswa.findUnique({
    where: {
        nim: nim,
    },
    });

    if (!mahasiswa) {
    return res.status(404).json({ message: "Mahasiswa tidak ditemukan" });
    }

    const namaMahasiswa = mahasiswa.nama

    const { error: uploadError } = await supabase
    .storage
    .from('mira')
    .upload(`mahasiswa/${namaMahasiswa}/${file.originalname}`, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
    });

    if (uploadError) {
    return res.status(500).json({ message: "Gagal mengunggah gambar", error: uploadError.message });
    }

    return res.status(200).json({
    message: "Gambar berhasil diunggah",
    data: {
        filename: file.originalname,
        folder: namaMahasiswa,
        mimetype: file.mimetype,
        size: file.size,
    },
    });

} catch (error) {
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
};