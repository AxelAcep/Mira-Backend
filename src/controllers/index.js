const userControllers = require('./user.controller');
const kelasControllers = require('./kelas.controller');

module.exports = {
  ...userControllers,
  ...kelasControllers,
};