const express = require("express");

const userRoutes = require("./user.routes");
const kelasRoutes = require("./kelas.routes");

const router = express.Router();

router.use("/user", userRoutes);
router.use("/kelas", kelasRoutes);

module.exports = router;
