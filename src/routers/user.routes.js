const express = require("express");
//const { passport, authenticateJWT } = require("../passport");

/*
const {
  register,
  updateProfile,
  GoogleCheck,
  loginManual,
  logout,
  googleCallback,
  isiSaldo,
  getUserById,
} = require("../controllers");
const {
  registerRateLimiter,
  loginRateLimiter,
} = require("../middlewares/RateLimit");

const registerValidation = require("../middlewares/validation/user/RegisterValidation");
const updateProfileValidation = require("../middlewares/validation/user/UpdateProfileValidation");
const SaldoValidation = require("../middlewares/validation/user/SaldoValidation");
*/
const router = express.Router();

router.get("/test", (req, res) => {
  res.send("Diaz Karbit");
});

router.get("/test2", (req, res) => {
  res.send("Kasumi Alice");
});

module.exports = router;
