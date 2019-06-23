import {rules, messages} from "./form_rules.js"

window.onload = () =>{
    let lang = document.getElementById("lang").innerText;
    new window.JustValidate("#register", {
        rules:rules,
        colorWrong: 'red',
        messages:messages[lang]
    })
}