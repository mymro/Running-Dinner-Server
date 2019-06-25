import {rules, messages} from "./form_rules/register_rules.js"
document.addEventListener('DOMContentLoaded', function() {

    let course_selects = {}
    course_selects.preferred = layout.selects[0].el;
    course_selects.disliked = layout.selects[1].el;
    let course_check_function = checkCourses(course_selects);
    rules.disliked_course.function = course_check_function;
    rules.preferred_course.function = course_check_function;

    let email_inputs = [];
    email_inputs.push(document.getElementById("email_member_1"));
    email_inputs.push(document.getElementById("email_member_2"));
    let email_check_function = checkEmail(email_inputs);
    rules.email_member_1.function = email_check_function;
    rules.email_member_2.function = email_check_function;

    new window.JustValidate("#register", {
        rules:rules,
        colorWrong: 'red',
        messages:messages[layout.lang]
    })
  });

function checkCourses(selects){
    return function (){
        if(selects.preferred.value != selects.disliked.value
            && selects.preferred.value != ""
            && selects.disliked.value != ""){
                return true;
        }else{
            return false
        }
    }
}

function checkEmail(email_inputs){
    return function(){
        if(email_inputs[0].value == email_inputs[1].value){
            return false;
        }else{
            return true;
        }
    }
}