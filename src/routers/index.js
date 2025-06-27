const express = require("express");

const userRoutes = require("./user.routes");
const kelasRoutes = require("./kelas.routes");
const recapRoutes = require("./recap.routes");

const router = express.Router();

router.use("/user", userRoutes);
router.use("/kelas", kelasRoutes);
router.use("/recap", recapRoutes);

module.exports = router;
