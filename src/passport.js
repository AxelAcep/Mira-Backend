const { PrismaClient } = require("@prisma/client");
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
require('dotenv').config();

passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await prisma.customer.findUnique({ where: { email } });

      if (!user) {
        return done(null, false, { message: 'User not found' });
      }

      const isPasswordValid = user.password === password; 
      if (!isPasswordValid) {
        return done(null, false, { message: 'Incorrect password' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' } 
      );

      return done(null, { user, token }); 
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

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token.' });
    }

    req.user = user; 
    next();
  });
}

module.exports = { passport, authenticateJWT };