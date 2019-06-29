const express = require('express');
const fs = require("fs");
const path = require('path')
const ip = require('ip');
const spawn = require('child_process');
const monitor = require('pg-monitor');
const jwt = require('jsonwebtoken');
const middleware = require('./middleware');
const cookieParser = require('cookie-parser')
const config = require('./config.json');
const maps_api = require('./api_key.json');
const bcrypt = require('bcrypt');
const initOptions = {/* initialization options */};
monitor.attach(initOptions);
const pgp = require('pg-promise')(initOptions);
const pug = require('pug');
const validator = require('validator');
const password_generator = require('generate-password');
const nodemailer = require('nodemailer');
const smtp_auth = require('./gmailSecret')
const settings = require('./settings');
const ServerError = require('./server_error');
const googleMapsClient = require('@google/maps').createClient({
    key: maps_api.geocode_matrix_key,
    Promise: Promise
  });

const rudi_db = pgp({
    host: config.db_host,
    port: config.db_port,
    database: config.db,
    user: config.db_user,
    password: config.db_pass,
    client_encoding: "UTF-8"
    //ssl: true
});

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: smtp_auth,
    secure: true,
    pool: true
   });

var email_renderer = {
    de:{
        register:pug.compileFile("./files/mail_templates/de/register.pug"),
        resend_confirmation:pug.compileFile("./files/mail_templates/de/confirmation.pug"),
        new_password:pug.compileFile("./files/mail_templates/de/new_password.pug")
    }
}

const courses = [
    "starter",
    "main",
    "dessert"
];

const roles = {
    admin: 'admin',
};

const solver_states = {
    undefined: 0,
    running: 1,
    finished: 2,
    error: 3
}

let solver_state = solver_states.undefined;
let settings_helper = new settings.SettingsHelper(rudi_db);

var app = express();
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.set('view engine', 'pug');
app.set('views', "./files/views")
middleware.setUpMiddleware(app, settings_helper);

app.get("/", (req, res)=>{
    res.render("home");
})

app.get("/login", (req, res)=>{
    let redirect = req.query.redirect
    res.render("login", {redirect: redirect});
})

app.get("/my/route", (req, res)=>{
    if(req.isAuthenticated()){
        res.render("my_route", {key: maps_api.maps_key, courses: courses});
    }else{
        res.redirect("/timed/out");
    }
})

app.get("/forgot/password", (req, res)=>{
    res.render("forgot_password")
})

app.get("/register", (req, res)=>{
    if(res.locals.settings.reg_open == 'true'){
        res.render("register", {country: config.countryString, courses: courses})
    }else{
        res.sendStatus(403);
    }
})

app.get("/timed/out", (req, res)=>{
    res.render("timed_out");
})

app.get("/confirm/email", (req, res)=>{
    let token = req.query.token;
    let locals = {}
    new Promise((resolve, reject)=>{
        jwt.verify(token, config.secret, (err, decoded)=>{
            if(err){
                locals.invalid_token = true
                reject(err)
            }else{
                resolve(decoded)
            }
        })
    }).then(decoded =>{
        return rudi_db.one("SELECT * FROM users WHERE email = $1 and email_confirmed = false", [decoded.email])
        .catch(err =>{
            locals.already_verified_or_does_not_exist = true;
            throw(err);
        })
    }).then(row=>{
        return rudi_db.none("UPDATE users SET email_confirmed = true WHERE email = $1", [row.email])
        .catch(err =>{
            locals.err_when_update = true;
            throw(err);
        }) 
    }).catch(err =>{
        console.err(err)
    }).finally(()=>{
        res.render("email_confirmed", locals)
    })  
})

app.get("/request/new/confirmation", (req, res)=>{
    if(req.query.redirect === "login"){
        res.render("request_new_confirmation", {redirect:"login", email: req.query.email})
    }else{
        res.render("request_new_confirmation", {email: ''});
    }
})

app.get("/new/confirmation/sent", (req, res)=>{
    res.render("new_confirmation_sent");
})

app.get("/admin", (req, res)=>{
    if(req.isAuthenticated('admin')){
        res.render("admin");
    }else{
        res.status(401);
        res.redirect('/timed/out');
    }
    
})

app.get("/registration/complete", (req, res)=>{
    res.render("registration_complete");
})

app.post("/login", (req, res)=>{
    let email = '' + req.body.email;
    let password = '' + req.body.password;
    
    if(validator.isEmail(email) && password.length == config.passwordLength){

        rudi_db.oneOrNone("SELECT users.id, users.email, users.team, users.password, users.email_confirmed, roles.role FROM users LEFT OUTER JOIN roles on (users.id = roles.id) WHERE users.email = $1", email)
        .then(row =>{
            if(row){
                return new Promise((resolve, reject)=>{
                    bcrypt.compare(password, row.password, (err, result) =>{
                        if(err){
                            reject(new ServerError(500, err.message));
                        }else if(!result){
                            reject(new ServerError(400, "password does not match"))
                        }else{
                            resolve(row)
                        }
                    })
                })
            }else {
                throw(new ServerError(400, "The user does not exist: " + email));
            }
        }).then(row =>{
            if(row.email_confirmed){
                res.cookie("auth", jwt.sign({user: row.id, role: row.role, team: row.team}, config.secret, {expiresIn: "1h"}));
                if(row.role == roles.admin){
                    res.json({
                        "redirect":"/admin"
                    })
                }else{
                    res.json({
                        "redirect":"/my/route"
                    })
                }
            }else{
                res.json({
                    "redirect": `/request/new/confirmation?redirect=login&email=${row.email}`
                })
            }
        }).catch(err =>{
            console.error(err)
            if(err instanceof ServerError){
                res.sendStatus(err.status_code);
            }else{
                res.sendStatus(500);
            }
        })
    }else{
        console.error("email and password are not valid")
        res.sendStatus(400);
    }
})

app.post("/request/new/confirmation", (req, res)=>{
    let email = '' + req.body.email;
    if(validator.isEmail(email)){
        rudi_db.oneOrNone("SELECT * FROM users WHERE email = $1 AND email_confirmed = false", email)
        .then(row =>{
            if(row){
                return sendMail(row.email,
                    res.locals.email.resend_confirmation_subject,
                    email_renderer[req.locale].resend_confirmation,
                    {
                        token: jwt.sign({email: email}, config.secret, {expiresIn: "24h"})
                    })
            }else{
                throw(new ServerError(400, "This email does not exist or it has already been confirmed."))
            }
        }).then(()=>{
            res.redirect('/new/confirmation/sent')
        }).catch(err=>{
            console.error(err);
            if(err instanceof ServerError){
                res.sendStatus(err.status_code);
            }else{
                res.sendStatus(500);
            }
        }) 
    }else{
        console.error(email + " is not an email");
        res.sendStatus(400);
    }
})

app.post("/request/new/password", (req, res)=>{
    let email =  ''+req.body.email;

    if(validator.isEmail(email)){
        let new_password = password_generator.generate({length:config.passwordLength, numbers:true});
        new Promise((resolve, reject)=>{
            bcrypt.hash(new_password, config.saltRounds, (err, hash)=>{
                if(err){
                    reject(new ServerError(500, err.message));
                }else{
                    resolve(hash);
                }
            })
        }).then(hash =>{
            return rudi_db.one("UPDATE users SET password = $1 WHERE email = $2 RETURNING *", [hash, email])
                    .catch(err =>{
                        throw(new ServerError(500, err.message));
                    })
        }).then(row =>{
            return sendMail(
                row.email,
                res.locals.email.request_new_password_subject,
                email_renderer[req.locale].new_password,
                {
                    first_name: row.first_name,
                    password: new_password,
                    email: row.email,
                    email_confirmed: row.email_confirmed,
                    token: jwt.sign({email: row.email}, config.secret, {expiresIn: "24h"})
                }
            )
        }).then(()=>{
            res.redirect("/login?redirect=new_password");
        }).catch(err =>{
            console.error(err);
            res.sendStatus(err.status_code);
        })
    }else{
        res.sendStatus(500);
    }
})

app.post("/team/register", (req,res)=>{
    if(res.locals.settings.reg_open != "true"){
        res.sendStatus(403);
        return;
    }

    checkRegistrationData(getRegistrationData(req))
    .then(data=>{
        let team = data.team;
        let member_1 = data.member_1;
        let member_2 = data.member_2;
        member_1.password = password_generator.generate({length:config.passwordLength, numbers:true});
        member_2.password = password_generator.generate({length:config.passwordLength, numbers:true});
        return rudi_db.tx(t =>{
            return t.one("INSERT INTO teams (street, doorbell, zip, city, country, preferred_course, disliked_course, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id", [team.street, team.doorbell, team.zip, team.city, team.country, team.preferred_course, team.disliked_course, team.notes])
            .then(res =>{
                return t.batch([createUser(member_1, res.id, t), createUser(member_2, res.id, t), Promise.resolve({
                    team:team,
                    member_1:member_1,
                    member_2:member_2
                })])
            })
        }).catch(err =>{
            throw(new ServerError(500, err.message));
        })
    }).then((data)=>{
        let member_1 = data[2].member_1;
        let member_2 = data[2].member_2;

        let promises = []
        promises.push(sendMail(
            member_1.email,
            res.locals.email.create_account_subject,
            email_renderer[req.locale].register,
            {
                email: member_1.email,
                first_name: member_1.first_name,
                password: member_1.password,
                token: jwt.sign({email: member_1.email}, config.secret, {expiresIn: "24h"})
            }
        ));
        promises.push(sendMail(
            member_2.email,
            res.locals.email.create_account_subject,
            email_renderer[req.locale].register,
            {
                email: member_2.email,
                first_name: member_2.first_name,
                password: member_2.password,
                token: jwt.sign({email: member_2.email}, config.secret, {expiresIn: "24h"})
            }
        ))

        return Promise.all(promises)
        .catch(err =>{
            console.error(err);//if the error just happens after the users are created ignore it
            return Promise.resolve();
        });
    }).then(()=>{
        res.redirect("/registration/complete");
    }).catch(err =>{
        console.error(err);
        res.sendStatus(err.status_code);
    })
})

app.post("/user/email/unconfirmed", (req, res)=>{
    let email = req.body.email;
    if(validator.isEmail(email)){
        rudi_db.one("SELECT * FROM users WHERE email = $1 AND email_confirmed = false", email)
        .then(()=>{
            res.send(true);
        }).catch((err)=>{
            console.error(err)
            res.send(false);
        })
    }else{
        res.send("invalid")
    }
})

app.post("/user/exists", (req, res)=>{
    let email = req.body.email;
    if(validator.isEmail(email)){
        userExists(email)
        .then(exists =>{
            res.send(exists)
        }).catch(err=>{
            console.error(err);
            res.sendStatus(err.status_code);
        })
    }else{
        res.send("invalid")
    }
})

app.post("/change/settings", (req, res)=>{
    if(req.isAuthenticated('admin')){
        settings_helper.changeSettings(req.body.settings)
        .then(()=>{
            res.sendStatus(200);
        }).catch(err =>{
            console.error(err);
            res.sendStatus(err.status_code);
        })
    }else{
        res.sendStatus(401);
    }
})

app.post("/start/routing", (req, res)=>{
    if(req.isAuthenticated('admin')){
        if(solver_state != solver_states.running){
            let stream = fs.createWriteStream("./log.txt", {})
            stream.on('open', ()=>{
                solver_state = solver_states.running;
                let python = spawn.spawn("python", ["start_routing.py"], {
                stdio: [ 'pipe', stream, stream]});
                python.on('close', (code) => {
                    if(code == 0){
                        solver_state = solver_states.finished;
                    }else{
                        solver_state = solver_states.error;
                    }
                });
            })
            res.sendStatus(200);
        }else{
            res.sendStatus(503);
        }
    }else{
        res.sendStatus(401);
    }
})

app.post("/get/solver/state", (req, res)=>{
    if(req.isAuthenticated('admin')){
        res.send(solver_state.toString());
    }else{
        res.sendStatus(401);
    }
})

app.post("/get/log", (req, res)=>{
    if(req.isAuthenticated('admin')){
        readFile(config.pythonLogPath)
        .then(file => sendData(file, res))
        .catch(err =>{
            console.error(err);
            res.sendStatus(err.status_code);
        })
    }else{
        res.sendStatus(401);
    }
})

app.post("/get/users", (req, res)=>{
    if(req.isAuthenticated('admin')){
        rudi_db.any("SELECT users.email_confirmed, users.first_name, users.last_name, users.email, users.phone, users.team, teams.street, teams.doorbell, teams.city, teams.zip, teams.preferred_course, teams.disliked_course FROM users, teams WHERE users.team = teams.id ORDER BY users.team ASC")
        .then(rows =>{
            let confirmed_teams = 0;
            for(let i = 0; i < rows.length - 1; i+=2){
                if(rows[i].email_confirmed || rows[i+1].email_confirmed){
                    confirmed_teams++;
                }
            }
            res.json({
                users:rows,
                confirmed_teams:confirmed_teams
            });
        })
    }else{
        res.sendStatus(401);
    }   
})

app.post("/my/route", (req, res)=>{
    if(req.isAuthenticated()){
        rudi_db.task(t =>{
            return t.any("SELECT * FROM groups WHERE cook = $1 OR team_1 = $1 OR team_2 = $1", res.locals.token.team)
            .then(group_rows=>{
                if(group_rows.length == 0){//there are no routes yet
                    return {};
                }
                let route = {
                    starter:{
                        cook:{}
                    },
                    main:{
                        cook:{}
                    },
                    dessert:{
                        cook:{}
                    }
                };
                if(group_rows.length != courses.length){
                    throw new ServerError(500, "there are too many groups for " + res.locals.token.team);
                }
                //get the info about each course
                let transactions = [];
                group_rows.forEach(group => {
                    transactions.push(t.one("SELECT street, doorbell, zip, city, country FROM teams where id = $1", group.cook)
                    .then(group_info =>{
                        route[group.course].cook.adress = group_info;
                    }))
                    if(group.cook == res.locals.token.team){
                        route[group.course].cook.self = true;

                        transactions.push(Promise.all([
                            rudi_db.many("SELECT phone, email, first_name, last_name, team as team_id FROM users WHERE team = ANY(ARRAY[$1, $2]) ORDER BY team ASC", [group.team_1, group.team_2]),
                            rudi_db.many("SELECT notes FROM teams WHERE id = ANY(ARRAY[$1, $2]) ORDER BY id ASC", [group.team_1, group.team_2])
                        ]).then(result =>{
                            let users = result[0];
                            let teams = result[1];
                            let notes_id = 0;
                            let last_team_id = users[0].team_id;
                            let members = [];
                            for(let i = 0; i < users.length; i++){
                                if(users[i].team_id != last_team_id){
                                    if(route[group.course].teams){
                                        route[group.course].teams.push({
                                            members: members,
                                            notes : teams[notes_id++].notes
                                        });
                                    }else{
                                        route[group.course].teams = [{
                                            members: members,
                                            notes : teams[notes_id++].notes
                                        }];
                                    }
                                    members = [];
                                    last_team_id = users[i].team_id
                                }
                                members.push(users[i]);
                            }
                            if(route[group.course].teams){
                                route[group.course].teams.push({
                                    members: members,
                                    notes : teams[notes_id++].notes
                                });
                            }else{
                                route[group.course].teams = [{
                                    members: members,
                                    notes : teams[notes_id++].notes
                                }];
                            }
                        }))
                    }else{
                        route[group.course].cook.self = false;
                        transactions.push(t.many("SELECT phone, email, first_name, last_name FROM users WHERE team = $1", group.cook)//get cook contact info
                        .then(users =>{
                            users.forEach(user =>{
                                if(route[group.course].cook.contact){
                                    route[group.course].cook.contact.push(user)
                                }else{
                                    route[group.course].cook.contact =[user]
                                }
                            })
                        }))
                    }
                })
                return t.batch(transactions)
                .then(()=>{// get lat long
                    let promises = []

                    courses.forEach(course =>{
                        let adress = route[course].cook.adress;
                        promises.push(googleMapsClient.geocode({address: adress.street + ' ' + adress.doorbell + ' ' + adress.zip + ' ' + adress.city + ' ' + adress.country})
                        .asPromise()
                        .then((response) => {
                            route[course].cook.adress.latLng = response.json.results[0].geometry.location;
                        }))
                    })

                    return Promise.all(promises);
                }).then(()=>{//get the center of those points for displaying it on a map
                    let average_latLng = {
                        lat: 0,
                        lng: 0
                    };

                    courses.forEach(course=>{
                        average_latLng.lat += route[course].cook.adress.latLng.lat;
                        average_latLng.lng += route[course].cook.adress.latLng.lng;
                    })
                    average_latLng.lat /= courses.length;
                    average_latLng.lng /= courses.length;
                    route.map_center = average_latLng;

                    return route;
                })
            }).then(route=>{
                res.json(route);
            }).catch(err =>{
                console.error(err)
                res.sendStatus(500);
            })
        })
    }else{
        readFile.sendStatus(401);
    }

})

app.post("/valid/phone", (req, res)=>{
    if(validator.isMobilePhone(req.body.phone)){
        res.send(true);
    }else{
        res.send(false);
    }
})

app.post("/valid/zip", (req, res)=>{
    if(validator.isPostalCode(req.body.zip, config.zipValidatorLocation)){
        res.send(true);
    }else{
        res.send(false);
    }
})

app.use(function(req, res) {
    //console.log(req.headers['x-forwarded-for'] || req.connection.remoteAddress);
    console.log("requested file: " + req.path);
    serveFile(req.path, res);
});

//------------------------------------------------------------
//start the server
//------------------------------------------------------------
settings_helper.initSettings()//first get all the settings, then start the server.
.then(()=>{
    new Promise((resolve, reject)=>{//clear log.txt
        fs.writeFile(config.pythonLogPath, "", (err)=>{
            if(err){
                reject(err);
            }else{
                resolve();
            }
        })
    })
}).then(()=>{//get all files in directoy
    return new Promise((resolve, reject)=>{
        fs.readdir("./", (err, files) => {
            if(err){
                reject(err);
            }else{
                resolve(files);
            }
        })
            
    })
}).then(files =>{//delete mps and sol files that might be left over from a previous solver run
    let promises = [];
    for (const file of files) {
        let ext = file.split('.');
        ext = ext[ext.length-1];
        if(ext == "sol" || ext == "mps"){
            promises.push( new Promise((resolve, reject)=>{
                fs.unlink(path.join("./", file), err => {
                    if(err){
                        reject(err);
                    }else{
                        resolve();
                    }
                });
            }))
        }
    }
    return Promise.all(promises);
}).then(()=>{
    var server = app.listen(3000, function () {
        var port = server.address().port
        console.log("webserver: %s:%s",ip.address(), port)
    })
}).catch(err =>{
    console.error(err)
    process.exit(1);
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

function createUser(user, team_id, transaction){
    let connection;
    if(transaction){
        connection = transaction;
    }else{
        connection = rudi_db
    }
    return new Promise((resolve, reject)=>{
        bcrypt.hash(user.password, config.saltRounds, (err, hash)=>{
            if(err){
                reject(new ServerError(500, err.message))
            }else{
                return connection.none("INSERT INTO users (email, phone, password, first_name, last_name, team) VALUES ($1, $2, $3, $4, $5, $6)", [user.email, user.phone, hash, user.first_name, user.last_name, team_id])
                .then(()=>{
                    resolve();
                }).catch(err =>{
                    reject(new ServerError(500, err.message))
                })
            }
        })
    })
}

function sendMail(to, subject, renderer, locals){
    locals.base_url = config.baseUrl;
    let mailOptions = {
        from: 'constantin.budin@gmail.com',
        to: to,
        subject: subject,
        html: renderer(locals)
        };
    return transporter.sendMail(mailOptions)
            .catch(err =>{
                throw(new ServerError(500, err.message));
            })
}

function getRegistrationData(req){
    let team = {}
    team.street = ''+req.body.street;
    team.doorbell = ''+req.body.doorbell;
    team.zip = ''+req.body.zip;
    team.city = ''+req.body.city;
    team.country = ''+req.body.country;
    team.preferred_course = ''+req.body.preferred_course;
    team.disliked_course = ''+req.body.disliked_course;
    team.notes = ''+req.body.notes;
    let member_1 = {}
    member_1.email= ''+req.body.email_member_1;
    member_1.phone = ''+req.body.phone_member_1;
    member_1.first_name = ''+req.body.first_name_member_1;
    member_1.last_name = ''+req.body.last_name_member_1;
    let member_2 ={}
    member_2.email = ''+req.body.email_member_2;
    member_2.phone = ''+req.body.phone_member_2;
    member_2.first_name = ''+req.body.first_name_member_2;
    member_2.last_name = ''+req.body.last_name_member_2;
    

    return {
        team: team, 
        member_1:member_1,
        member_2:member_2}
}

function checkRegistrationData(data){
    let team = data.team;
    let member_1 = data.member_1;
    let member_2 = data.member_2;
    return Promise.all([userExists(member_1.email), userExists(member_2.email)])
    .then(exists =>{
        if(exists[0]){
            return Promise.reject(new ServerError(400, "email already exists: " + member_1.email));
        }
        if(exists[1]){
            return Promise.reject(new ServerError(400, "email already exists: " + member_2.email));
        }
        if(member_1.email == member_2.email){
            return Promise.reject(new ServerError(400, "The emails are the same"));
        }
        if(!validator.isEmail(member_1.email)){
            return Promise.reject(new ServerError(400, "This is not a valid email: " + member_1.email));
        }
        if(!validator.isEmail(member_2.email)){
            return Promise.reject(new ServerError(400, "This is not a valid email: " + member_2.email));
        }
        if(!validator.isPostalCode(team.zip, config.zipValidatorLocation)){
            return Promise.reject(new ServerError(400, "Zip code is invalid: " + team.zip));
        }
        if(team.street.length <= 0){
            return Promise.reject(new ServerError(400, "street is invalid: " + team.street));
        }
        if(team.doorbell.length <= 0){
            return Promise.reject(new ServerError(400, "door_bell is invalid" + team.doorbell));
        }
        if(team.city.length <= 0){
            return Promise.reject(new ServerError(400, "city is invalid" + team.city));
        }
        if(team.country.length <= 0){
            return Promise.reject(new ServerError(400, "country is invalid" + team.country));
        }
        if(!validator.isMobilePhone(member_1.phone)){
            return Promise.reject(new ServerError(400, "This is not a valid phone number" + member_1.phone));
        }
        if(!validator.isMobilePhone(member_2.phone)){
            return Promise.reject(new ServerError(400, "This is not a valid phone number" + member_2.phone));
        }
        if(!validator.isAlpha(member_1.first_name) && member_1.first_name.length <= 0){
            return Promise.reject(new ServerError(400, "This is not a valid name" + member_1.first_name));
        }
        if(!validator.isAlpha(member_1.last_name) && member_1.last_name.length <= 0){
            return Promise.reject(new ServerError(400, "This is not a valid name" + member_1.last_name));
        }
        if(!validator.isAlpha(member_2.first_name) && member_2.first_name.length <= 0){
            return Promise.reject(new ServerError(400, "This is not a valid name" + member_2.first_name));
        }
        if(!validator.isAlpha(member_2.last_name) && member_2.last_name.length <= 0){
            return Promise.reject(new ServerError(400, "This is not a valid name" + member_2.last_name));
        }
        if(!courses.includes(team.preferred_course)){
            return Promise.reject(new ServerError(400, "This is not a valid preferred course" + team.preferred_course));
        }
        if(!courses.includes(team.disliked_course)){
            return Promise.reject(new ServerError(400, "This is not a valid disliked course" + team.disliked_course));
        }
        if(team.preferred_course == team.disliked_course){
            return Promise.reject(new ServerError(400, "Preferred and disliked course are the same"));
        }
        return Promise.resolve(data);
    }).catch(err =>{
        if(err instanceof ServerError){
            throw(err)
        }else{
            throw(new ServerError(500, err.message))
        }
    })
}

function serveFile(relPathToFile, res){
    checkValidExtension(__dirname + config.baseDir + relPathToFile)
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
        if(config.validExtensions[extension]){
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
            resolve({stream: file_stream, contentType: config.validExtensions[extension]});
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