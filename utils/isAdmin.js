const { admin } = require('../credentials');

const isMemberAdmin = (id) => {
  return id === admin.id;
};

module.exports = isMemberAdmin;
