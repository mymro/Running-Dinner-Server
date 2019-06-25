export let rules = {
    street:{
        required:true,
        minLength:1
    },
    doorbell:{
        required:true,
        minLength:1
    },
    zip:{
        required:true,
        minLength:1,
        remote:{
            url: '/valid/zip',
            sendParam: 'zip',
            successAnswer: 'true',
            method: 'POST'
        }
    },
    city:{
        required:true,
        minLength:1
    },
    country:{
        required:true,
        minLength:1
    },
    email_member_1:{
        required:true,
        email:true,
        function: null, //set later
        remote:{
            url: '/user/exists',
            sendParam: 'email',
            successAnswer: 'false',
            method: 'POST'
        }
    },
    email_member_2:{
        required:true,
        email:true,
        function: null, //set later
        remote:{
            url: '/user/exists',
            sendParam: 'email',
            successAnswer: 'false',
            method: 'POST'
        }
    },
    first_name_member_1:{
        required:true,
        minLength:1
    },
    first_name_member_2:{
        required:true,
        minLength:1
    },
    last_name_member_1:{
        required:true,
        minLength:1
    },
    last_name_member_2:{
        required:true,
        minLength:1
    },
    phone_member_1:{
        required:true,
        remote:{
            url:"/valid/phone",
            sendParam:"phone",
            successAnswer:"true",
            method:"POST"
        }
    },
    phone_member_2:{
        required:true,
        remote:{
            url:"/valid/phone",
            sendParam:"phone",
            successAnswer:"true",
            method:"POST"
        }
    },
    preferred_course:{
        function:null//set later in javascript
    },
    disliked_course:{
        function:null//set later in javascript
    }
}

export let messages={
    de:{
        city:"Das Feld darf nicht leer sein.",
        street:"Das Feld darf nicht leer sein.",
        doorbell:"Das Feld darf nicht leer sein.",
        zip:"Das Feld darf nicht leer sein.",
        country:"Das Feld darf nicht leer sein.",
        first_name_member_1:"Das ist kein valider Name",
        first_name_member_2:"Das ist kein valider Name",
        last_name_member_1:"Das ist kein valider Name.",
        last_name_member_2:"Das ist kein valider Name.",
        email_member_1:{
            email:"Das ist keine valide Email.",
            remote:"Ein Nutzer mit dieser Email existiert bereits oder die Email ist nicht valide.",
            required:"Dieses Feld darf nicht leer sein.",
            function:"Die Emails dürfen nicht gleich sein."
        },
        email_member_2:{
            email:"Das ist keine valide Email.",
            remote:"Ein Nutzer mit dieser Email existiert bereits oder die Email ist nicht valide",
            required:"Dieses Feld darf nicht leer sein.",
            function:"Die Emails dürfen nicht gleich sein."
        },
        phone_member_1:"Das ist keine valide Telefonnummer.",
        phone_member_2:"Das ist keine valide Telefonnummer.",
        disliked_course:"Bitte wähle zwei verschieden Gänge",
        preferred_course:"Bitte wähle zwei verschieden Gänge"
    }
}