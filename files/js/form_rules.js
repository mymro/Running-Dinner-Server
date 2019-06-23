export let rules = {
    email:{
        required:true,
        email:true,
        remote:{
            url: '/user/exists',
            sendParam: 'email',
            successAnswer: 'false',
            method: 'POST'
        }
    },
    new_password:{
        required:true,
        strength:{
            custom:/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,15}$/ ///8 characters long one number one letter
        }
    },
    password:{
        required:true,
        maxLength:15,
        minLength:8,
    },
    first_name:{
        required:true
    },
    last_name:{
        required:true
    },
    phone:{
        required:true,
        strength:{
            custom:"^[0-9]{5,20}$"//only numbers
        }
    }
}

export let messages={
    de:{
        first_name:"Das ist kein valider Name",
        last_name:"Das ist kein valider Name.",
        email:{
            email:"Das ist keine valide Email.",
            remote:"Ein Nutzer mit dieser Email existiert bereits"
        },
        password:"Das Passowrt muss mindestens 8 Zeichen, einen Buchstaben und eine Zahl haben.",
        phone:"Das ist keine valide Telefonnummer.",
        new_password:"Das passwort soll ziwschen 8 und 15 Zeichen haben, sowie mindestens eine Zahl und einen Buchstaben enthalten."
    }
}