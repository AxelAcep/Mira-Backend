const userControllers = require('./user.controller');
const kelasControllers = require('./kelas.controller');
const recapControllers = require('./recap.controller');

module.exports = {
  ...userControllers,
  ...kelasControllers,
  ...recapControllers,
};