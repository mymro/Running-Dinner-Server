export let rules = {
    email:{
        required:true,
        remote:{
            url: '/user/exists',
            sendParam: 'email',
            successAnswer: 'true',
            method: 'POST'
        }
    },
    password:{
        required:true,
        minLength:5
    }
}

export let messages = {
    de:{
        email:{
            required:"Das Feld ist notwendig.",
            remote:"Die wurde noch nicht registriert oder sie ist nicht valide"
        },
        password:{
            required:"Das Feld ist notwending",
            minLength:"Das Passwort ist mindestens 5 Zeichen lang."
        }
    }
}