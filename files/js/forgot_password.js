import {rules, messages} from "./form_rules/forgot_password_rules.js"
document.addEventListener('DOMContentLoaded', function() {
    new window.JustValidate("#forgot_password", {
        rules:rules,
        colorWrong: 'red',
        messages:messages[layout.lang]
    });
})