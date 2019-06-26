export let rules ={
    email:{
        required: true,
        remote:{
            url:"/user/exists",
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
            remote:"Diese Email wurde noch nicht bei uns registriert"
        }
    }
}