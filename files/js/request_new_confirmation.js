import {rules, messages} from "./form_rules/request_new_confirmation_rules.js"
document.addEventListener('DOMContentLoaded', function() {
    new window.JustValidate("#confirmation", {
        rules:rules,
        colorWrong: 'red',
        messages:messages[layout.lang]
    });
})