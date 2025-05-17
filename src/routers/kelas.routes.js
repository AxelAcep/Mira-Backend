const express = require("express");
const { passport, authenticateJWT } = require("../passport");

const {
  loginDosen,
  logout,
  getDosenByNidn,
} = require("../controllers");

const {loginRateLimiter} = require('../middlewares/RateLimit');

const router = express.Router();

router.post('/login', loginRateLimiter ,loginDosen);
router.get('/profile', authenticateJWT , getDosenByNidn);
router.get('/logout', authenticateJWT ,logout);

router.get("/test2", authenticateJWT ,(req, res) => {res.send("Kasumi Alice");}); // debugging

module.exports = router;
