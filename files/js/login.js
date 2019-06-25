import {rules, messages} from "./form_rules/login_rules.js"
document.addEventListener('DOMContentLoaded', function() {
    let wrong_credentials = document.getElementById("wrong_credentials");
    let oops = document.getElementById("oops");

    new window.JustValidate("#login", {
        rules:rules,
        colorWrong: 'red',
        messages:messages[layout.lang],
        submitHandler: function (form, values, ajax) {
            ajax({
              url: '/login',
              method: 'POST',
              data: values,
              async: true,
                callback:(response)=>{
                    response = JSON.parse(response);
                    if(response.redirect){
                        window.location.href = response.redirect;
                    }else{
                        wrong_credentials.style.display = "none";
                        oops.style.display = "block";
                    }
                },
                error:(err)=>{
                    if(err == "Bad Request"){
                        wrong_credentials.style.display = "block";
                        oops.style.display = "none";
                    }else{
                        wrong_credentials.style.display = "none";
                        oops.style.display = "block";
                    }
                }
            })
        }
    });
})