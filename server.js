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
const saltRounds = 12;
const initOptions = {/* initialization options */};
monitor.attach(initOptions);
const pgp = require('pg-promise')(initOptions);

const _baseDir = config.baseDir;
const validExtensions = config.validExtensions;

var app = express();
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(jwtMiddleware.checkToken);

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