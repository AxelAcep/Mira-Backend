const { PrismaClient } = require("@prisma/client");
const ClientError = require("../errors/ClientError");
const passport = require('passport');
const { get } = require("http");
const prisma = new PrismaClient();

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
        const { KodeKelas, kodeMatakuliah, jadwal} = req.body;
         const kodeDosen = req.dosen.nidn;
    
        const kelas = await prisma.kelas.create({
        data: {
            KodeKelas,
            kodeMatakuliah,
            kodeDosen,
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
}

module.exports = {
    addMatakuliah,
    createKelas,
};