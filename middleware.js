let jwt = require('jsonwebtoken');
const config = require('./config.json');
const translations = require('./lang');
const locale = require("locale");
const supported_lang = ["de"];
const default_lang = "de";

let setUpMiddleware = (app, settings_helper) => {
  app.use(locale(supported_lang, default_lang));
  app.use(addLocals);
  app.use(checkToken);
  app.use(settings_helper.getMiddleware());
  app.use(addIsAuthenticated);
}


let checkToken = (req, res, next) => {
  let token = req.headers['x-access-token'] || req.headers['authorization'] || req.cookies.auth; // Express headers are auto converted to lowercase
  if (token) {
    if (token.startsWith('Bearer ')) {
        // Remove Bearer from string
        token = token.slice(7, token.length);
    }
    new Promise((resolve, reject)=>{
      jwt.verify(token, config.secret, (err, decoded) => {
        if (err) {
          reject(err)
        } else {
          resolve(decoded);
        }
      });
    }).then(decoded =>{
      res.locals.token = decoded;
      res.locals.authenticated = true;
    }).catch(err =>{
      console.error(err);
      res.locals.authenticated = false;
    }).finally(()=>{
      next();
    })
  } else {
    res.locals.authenticated = false;
    next();
  }
};

let addLocals = (req, res, next)=>{
  res.locals = translations[req.locale];
  next();
}

let addIsAuthenticated = (req, res, next)=>{
  req.isAuthenticated = (role)=>{
    if(role){
      return res.locals.authenticated && res.locals.token.role == role;
    }else{
      return res.locals.authenticated;
    }
  }
  next();
}

module.exports = {
  setUpMiddleware: setUpMiddleware
}