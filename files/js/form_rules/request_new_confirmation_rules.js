export let rules ={
    email:{
        required: true,
        remote:{
            url:"/user/email/unconfirmed",
            method:"POST",
            sendParam:"email",
            successAnswer: 'true',
        }
    }
}

export let messages={
    de:{
        email:{
            require:"Bitte gib eine Email an.",
            remote:"Die Email wurde bereits aktiviert oder existiert nicht in unserer Datenbank."
        }
    }
}