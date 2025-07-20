const express = require("express");
const { passport, authenticateJWT } = require("../passport");

const {
    getRecapByKelas,
    createRecap,
    deleteRecap,
    getMahasiswaByRecap,
    updateKehadiran,
} = require("../controllers");

const router = express.Router();

router.get('/kelas/:kelasId', authenticateJWT, getRecapByKelas);
router.get('/mahasiswa/:recapId', authenticateJWT, getMahasiswaByRecap ); // Assuming this is to get recap by mahasiswa


router.post('/kelas', authenticateJWT, createRecap);
router.put('/kelas', authenticateJWT, updateKehadiran);
router.delete('/kelas', authenticateJWT, deleteRecap);

module.exports = router;
