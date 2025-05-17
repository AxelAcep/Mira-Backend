const { PrismaClient } = require("@prisma/client");
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
require('dotenv').config();

passport.use(new LocalStrategy(
  { usernameField: 'nidn' }, // pakai 'nidn' sebagai username
  async (nidn, password, done) => {
    try {
      const dosen = await prisma.dosen.findUnique({ where: { nidn } });

      if (!dosen) {
        return done(null, false, { message: 'Dosen Tidak Ditemukan' });
      }

      const isPasswordValid = dosen.password === password; 
      if (!isPasswordValid) {
        return done(null, false, { message: 'Incorrect password' });
      }

      const token = jwt.sign(
        { nidn: dosen.nidn }, // hanya menggunakan nidn
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return done(null, { dosen, token });
    } catch (err) {
      return done(err);
    }
  }
));

function authenticateJWT(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized. Token is missing.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, dosen) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token.' });
    }

    req.dosen = dosen; // menyimpan informasi dosen di req
    next();
  });
}

module.exports = { passport, authenticateJWT };
