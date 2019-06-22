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
const locale = require("locale")

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
const translations = require('./language/de.json')

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

app.post("/user/create", (req,res)=>{
    //TODO add sanity checks for user input
    let email = req.body.email;
    let phone = req.body.phone;
    let password = req.body.password;
    let first_name = req.body.first_name;
    let last_name = req.body.last_name;
    bcrypt.hash(password, saltRounds, (err, hash)=>{
        if(err){
            res.sendStatus(500);
        }else{
            rudi_db.none("INSERT INTO users (email, password, phone, first_name, last_name) " +
                "VALUES ($1, $2, $3, $4, $5)", [email, hash, phone, first_name, last_name])
            .then(()=>{
                res.redirect("/");
            }).catch(err=>{
                console.log(err);
                res.sendStatus(400);
            })
        }
    })
})

app.post("/get_log", (req, res)=>{
    readFile("./log.txt")
    .then(file => sendData(file, res))
    .catch(err =>{
        console.log(err);
        res.sendStatus(404);
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

function serveFile(relPathToFile, res){
    checkValidExtension(__dirname + _baseDir + relPathToFile)
        .then(readFile)
        .then(data => sendData(data, res))
        .catch(err =>{
            console.log(err);
            res.sendStatus(404);
        });
    
 }

 function checkValidExtension(pathToFile){
    return new Promise((resolve, reject)=>{
        let extension = path.extname(pathToFile);
        if(validExtensions[extension]){
            resolve(pathToFile);
        }else{
            reject(pathToFile + " has no valid extension");
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
        /*fs.readFile(pathToFile, (err, data)=>{
            if(!err){
                let extension = path.extname(pathToFile);
                resolve({data: data, contentType: validExtensions[extension]});
            }else{
                reject(err);
            }
        })*/
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
        file.stream.on("error", ()=>{
            res.end()
            reject("there was an error when reading a file")
        })
    });
}