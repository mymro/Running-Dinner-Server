module.exports = {
    secret: 'thisismyjwttokenhive',
    validExtensions : {
        ".html" : "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".txt": "text/plain",
        //".jpg": "image/jpeg",
        //".gif": "image/gif",
        //".png": "image/png",
        //".map": "text/scss",
    },
    baseDir: "/files",
    zipValidatorLocation: "AT",
    countryString: "Austria",
    passwordLength: 5,
    saltRounds: 12,
  };