const express = require('express');
const fs = require("fs");
const path = require('path')
const ip = require('ip');
const spawn = require('child_process');
const monitor = require('pg-monitor');
const jwt = require('jsonwebtoken');
const jwtMiddleware = require('./jwtMiddleware');
const cookieParser = require('cookie-parser')
const config = require('./config');
const bcrypt = require('bcrypt');
const initOptions = {/* initialization options */};
monitor.attach(initOptions);
const pgp = require('pg-promise')(initOptions);
const pug = require('pug');
const locale = require("locale");
const translations = require('./lang');
const validator = require('validator');

const supported_lang = ["de"];
const default_lang = "de";

const rudi_db = pgp({
    host: 'localhost',
    port: 5432,
    database: 'rudi',
    user: 'rudi_server',
    password: '1234',
    //ssl: true
});

const saltRounds = 12;
const _baseDir = config.baseDir;
const validExtensions = config.validExtensions;

class ServerError extends Error{
    constructor(status_code, message, fileName, lineNumber){
        super(message, fileName, lineNumber)
        this.status_code = status_code
    }
}

var app = express();
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(jwtMiddleware.checkToken);
app.use(locale(supported_lang, default_lang))
app.use((req, res, next)=>{
    res.locals = translations[req.locale]
    next();
})
app.set('view engine', 'pug');
app.set('views', "./files/views")

let stream = fs.createWriteStream("./log.txt")

stream.on('open', ()=>{
    let python = spawn.spawn("python", ["test.py"], {
    stdio: [ 'pipe', stream, stream]});
    
    python.unref()
      
    python.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
      });
})

app.get("/", (req, res, next)=>{
    req.url = "/index.html";
    next();
})

app.get("/login", (req,res)=>{
    res.render("login")
})

app.post("/user/exists", (req, res)=>{
    let email = req.body.email;
    userExists(email)
    .then(exists =>{
        res.send(exists)
    }).catch(err=>{
        console.error(err);
        res.sendStatus(err.status_code);
    })
})

app.post("/user/create", (req,res)=>{
    //''+ just to be sure they are all strings
    let email = ''+req.body.email;
    let phone = ''+req.body.phone;
    let password = ''+req.body.password;
    let first_name = ''+req.body.first_name;
    let last_name = ''+req.body.last_name;

    userExists(email)
    .then(exists =>{
        if(!exists
        && validator.isEmail(email)
        && validator.isMobilePhone(phone)
        && password.match(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,15}$/)//min 8 characters 1 number one letter
        && validator.isAlpha(first_name) && first_name.length > 0
        && validator.isAlpha(last_name) && last_name.length > 0){

            bcrypt.hash(password, saltRounds, (err, hash)=>{
                if(err){
                    return Promise.reject(ServerError(500, "Hashing error"))
                }else{
                    return rudi_db.none("INSERT INTO users (email, password, phone, first_name, last_name) " +
                        "VALUES ($1, $2, $3, $4, $5)", [email, hash, phone, first_name, last_name])
                        .catch(err =>{
                            throw(ServerError(500, err.message, err.fileName, err.lineNumber))
                        })
                }
            })
        }else{
            return Promise.reject(ServerError(400, "Wrong user input"))
        }
    }).then(()=>{
        res.redirect("/");
    }).catch(err =>{
        console.error(err);
        res.sendStatus(err.status_code);
    })
})

app.post("/get_log", (req, res)=>{
    readFile("./log.txt")
    .then(file => sendData(file, res))
    .catch(err =>{
        console.error(err);
        res.sendStatus(err.status_code);
    })
})

app.use(function(req, res) {
    //console.log(req.headers['x-forwarded-for'] || req.connection.remoteAddress);
    console.log("requested file: " + req.path);
    serveFile(req.path, res);
});

var server = app.listen(3000, function () {
    var host = server.address().address
    var port = server.address().port
    
    console.log("webserver: %s:%s",ip.address(), port)
 })

function userExists(email){
    return rudi_db.oneOrNone("SELECT * FROM users WHERE email = $1", email)
    .then(user =>{
        if(user){
            return Promise.resolve(true);
        }else{
            return Promise.resolve(false);
        }
    }).catch(err =>{
        throw(ServerError(500, err.message, err.fileName, err.lineNumber));
    })
}

function serveFile(relPathToFile, res){
    checkValidExtension(__dirname + _baseDir + relPathToFile)
        .then(readFile)
        .then(data => sendData(data, res))
        .catch(err =>{
            console.error(err);
            res.sendStatus(err.status_code);
        });
    
 }

 function checkValidExtension(pathToFile){
    return new Promise((resolve, reject)=>{
        let extension = path.extname(pathToFile);
        if(validExtensions[extension]){
            resolve(pathToFile);
        }else{
            reject(ServerError(400, pathToFile + " has no valid extension"));
        }
    })
 }

 function readFile(pathToFile){
     return new Promise((resolve, reject) =>{
        let file_stream = fs.createReadStream(pathToFile);
        let extension = path.extname(pathToFile);
        file_stream.on("open", ()=>{
            resolve({stream: file_stream, contentType: validExtensions[extension]});
        })
        file_stream.on("error", err=>{
            file_stream.destroy();
            reject(ServerError(500, err.message, err.fileName, err.lineNumber))
        })
     })
 }

 function sendData(file, res){
    return new Promise((resolve, reject)=>{
        res.contentType(file.contentType);
        res.status(200);
        file.stream.pipe(res);

        file.stream.on("end", ()=>{
            res.end();
            resolve(null);
        })
        file.stream.on("error", err=>{
            file.stream.destroy();
            reject(ServerError(500, err.message, err.fileName, err.lineNumber))
        })
    });
}