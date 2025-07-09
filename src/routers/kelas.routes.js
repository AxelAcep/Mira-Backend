const express = require("express");
const { passport, authenticateJWT } = require("../passport");
const multer = require('multer');
const upload = multer(); // pakai memory storage (buffer)

const {
  addMatakuliah,
  addMahasiswa,
  createKelas,
  getmatakuliah,
  getKelasByDosen,
  getMahasiswaByKelas,
  uploudGambar,
  removeMahasiswa,
  deleteImageFromSupabase,
  getAllKelas,
} = require("../controllers");


const router = express.Router();

router.post('/matakuliah', authenticateJWT ,addMatakuliah);
router.post('/mahasiswa', authenticateJWT ,addMahasiswa);
router.post('/kelas', authenticateJWT , createKelas);
router.post('/upload', authenticateJWT, upload.array('images', 10), uploudGambar);

router.get('/matakuliah', authenticateJWT ,getmatakuliah);
router.get('/kelas', authenticateJWT ,getKelasByDosen);
router.get('/mahasiswa/:kodeKelas', authenticateJWT ,getMahasiswaByKelas);
router.get('/kelasAll', authenticateJWT, getAllKelas)

router.delete('/mahasiswa', authenticateJWT ,removeMahasiswa); 
router.delete('/delete-image', authenticateJWT ,deleteImageFromSupabase);

router.get("/test2", authenticateJWT ,(req, res) => {res.send("Kasumi Alice");}); // debugging

module.exports = router;
