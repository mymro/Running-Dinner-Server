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
        });
      })
    }

    getMiddleware(){
        let object = this;
        return (req, res, next)=>{
            res.locals.settings = object.settings;
            next();
        }
    }
  }

  module.exports = {SettingsHelper: SettingsHelper}