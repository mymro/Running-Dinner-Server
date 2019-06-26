const ServerError = require('./server_error')

class SettingsHelper{
    constructor(db){
      this.db = db;
      this.settings = {};
    }
  
    initSettings() {
      return this.db.any("SELECT * FROM settings")
      .then(rows =>{
        rows.forEach(row => {
          this.settings[row.name] = row.data;
        })
      }).catch(err =>{
        throw(new ServerError(500, err.message));
      });
    }

    getMiddleware(){
        let object = this;
        return (req, res, next)=>{
            res.locals.settings = object.settings;
            next();
        }
    }

    changeSettings(settings){
      return this.db.tx(async t=>{
        for(let key in settings){
          await t.none("UPDATE settings set data = $1 WHERE name = $2", [settings[key].toString(), key.toString()])
        }
      }).catch(err =>{
        throw(new ServerError(500, err.message));
      })
    }
  }

  module.exports = {SettingsHelper: SettingsHelper}