let jwt = require('jsonwebtoken');
const config = require('./config.js');

let checkToken = (req, res, next) => {
    let token = req.headers['x-access-token'] || req.headers['authorization'] || req.cookies.auth; // Express headers are auto converted to lowercase
  if (token) {
    if (token.startsWith('Bearer ')) {
        // Remove Bearer from string
        token = token.slice(7, token.length);
    }
    jwt.verify(token, config.secret, (err, decoded) => {
      if (err) {
        req.authenticated = false;
      } else {
        req.authenticated = true;
        req.token = decoded;
      }
    });
  } else {
    req.authenticated = false;
  }
  next();
};

module.exports = {
  checkToken: checkToken
}