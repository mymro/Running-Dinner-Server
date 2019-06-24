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

app.get("/register", (req,res)=>{
    res.render("register")
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

app.post("/group/register", (req,res)=>{
    //''+ just to be sure they are all strings
    let email_member_1 = ''+req.body.email_member_1;
    let phone_member_1 = ''+req.body.phone_member_1;
    let first_name_member_1 = ''+req.body.first_name_member_1;
    let last_name_member_1 = ''+req.body.last_name_member_1;
    let email_member_2 = ''+req.body.email_member_2;
    let phone_member_2 = ''+req.body.phone_member_2;
    let first_name_member_2 = ''+req.body.first_name_member_2;
    let last_name_member_2 = ''+req.body.last_name_member_2;

    Promise.all(userExists(email_member_1), userExists(email_member_2))
    .then(exists =>{
        if(!exists[0] && !exists[1]
        && validator.isEmail(email_member_1) && validator.isEmail(email_member_2)
        && validator.isMobilePhone(phone_member_1) && validator.isMobilePhone(phone_member_2)
        && validator.isAlpha(first_name_member_1) && first_name_member_1.length > 0
        && validator.isAlpha(first_name_member_2) && first_name_member_2.length > 0
        && validator.isAlpha(last_name_member_1) && last_name_member_1.length > 0
        && validator.isAlpha(last_name_member_2) && last_name_member_2.length > 0){

            bcrypt.hash(password, saltRounds, (err, hash)=>{
                if(err){
                    return Promise.reject(new ServerError(500, "Hashing error"))
                }else{
                    return rudi_db.none("INSERT INTO users (email, password, phone, first_name, last_name) " +
                        "VALUES ($1, $2, $3, $4, $5)", [email, hash, phone, first_name, last_name])
                        .catch(err =>{
                            throw(new ServerError(500, err.message))
                        })
                }
            })
        }else{
            return Promise.reject(new ServerError(400, "Wrong user input"))
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
        throw(new ServerError(500, err.message));
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
            reject(new ServerError(400, pathToFile + " has no valid extension"));
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
            reject(new ServerError(500, err.message))
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
            reject(new ServerError(500, err.message))
        })
    });
}