const express = require("express");
const { passport, authenticateJWT } = require("../passport");
const multer = require("multer");
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
  mergeEncodings,
  downloadModel,
  deleteKelas,
  editKelas,
  getKelasById,
  createKelasAdmin,
  editKelasAdmin,
  getMatakuliah,
  editMatakuliah,
} = require("../controllers");

const router = express.Router();

router.post("/matakuliah", authenticateJWT, addMatakuliah);
router.post("/mahasiswa", authenticateJWT, addMahasiswa);
router.post("/kelas", authenticateJWT, createKelas);
router.post("/adminkelas", authenticateJWT, createKelasAdmin);
router.post(
  "/upload",
  authenticateJWT,
  upload.array("images", 10),
  uploudGambar,
);
router.post("/mergeEncodings", authenticateJWT, mergeEncodings);

router.post("/downloadModel", authenticateJWT, downloadModel);

router.get("/matakuliah", authenticateJWT, getmatakuliah);
router.get("/kelas", authenticateJWT, getKelasByDosen);
router.get("/kelas/:id", authenticateJWT, getKelasById);
router.get("/mahasiswa/:kodeKelas", authenticateJWT, getMahasiswaByKelas);
router.get("/kelasAll", authenticateJWT, getAllKelas);
router.get("/matakuliahsingle/:kodematakuliah", authenticateJWT, getMatakuliah)

router.delete("/mahasiswa", authenticateJWT, removeMahasiswa);
router.delete("/delete-image", authenticateJWT, deleteImageFromSupabase);
router.delete("/deleteKelas", authenticateJWT, deleteKelas)


router.put("/edit", authenticateJWT, editKelas),
router.put("/editAdmin", authenticateJWT, editKelasAdmin),
router.put("/matakuliah", authenticateJWT, editMatakuliah),

router.get("/test2", authenticateJWT, (req, res) => {
  res.send("Kasumi Alice");
}); // debugging

module.exports = router;
