const express = require("express");
const { passport, authenticateJWT } = require("../passport");

const {
  loginDosen,
  logout,
  getDosenByNidn,
  createMahasiswa,
  getAllMahasiswa,
  getMahasiswaByNim,
  getAllDosen,
  createDosen,
  getDetailDosen,
  trainMahasiswa,
  editMahasiswa,
  deleteMahasiswa,
  deleteDosen,
  editDosen,
} = require("../controllers");

const { loginRateLimiter } = require("../middlewares/RateLimit");

const router = express.Router();

router.post("/login", loginRateLimiter, loginDosen);
router.get("/profile", authenticateJWT, getDosenByNidn);
router.get("/dosen/:nidn", authenticateJWT, getDetailDosen);
router.get("/logout", authenticateJWT, logout);

router.post("/mahasiswa", authenticateJWT, createMahasiswa);
router.get("/mahasiswa", authenticateJWT, getAllMahasiswa);
router.post("/trainMahasiswa", authenticateJWT, trainMahasiswa);

router.get("/dosen", authenticateJWT, getAllDosen);
router.post("/dosen", authenticateJWT, createDosen);

router.put("/mahasiswa", authenticateJWT, editMahasiswa)
router.put("/dosen", authenticateJWT, editDosen)

router.get("/mahasiswa/:nim", authenticateJWT, getMahasiswaByNim);
router.delete("/mahasiswa", authenticateJWT, deleteMahasiswa);
router.delete("/dosen", authenticateJWT, deleteDosen);

router.get("/test2", authenticateJWT, (req, res) => {
  res.send("Kasumi Alice");
}); // debugging

module.exports = router;
