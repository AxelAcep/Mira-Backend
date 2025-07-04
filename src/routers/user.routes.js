const express = require("express");
const { passport, authenticateJWT } = require("../passport");

const {
  loginDosen,
  logout,
  getDosenByNidn,
  createMahasiswa,
  getAllMahasiswa,
  getMahasiswaByNim,
} = require("../controllers");

const {loginRateLimiter} = require('../middlewares/RateLimit');

const router = express.Router();

router.post('/login', loginRateLimiter ,loginDosen);
router.get('/profile', authenticateJWT , getDosenByNidn);
router.get('/logout', authenticateJWT ,logout);

router.post('/mahasiswa', authenticateJWT, createMahasiswa);
router.get('/mahasiswa', authenticateJWT, getAllMahasiswa);

router.get('/mahasiswa/:nim', authenticateJWT, getMahasiswaByNim);

router.get("/test2", authenticateJWT ,(req, res) => {res.send("Kasumi Alice");}); // debugging

module.exports = router;
