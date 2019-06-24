import {rules, messages} from "./form_rules.js"
document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll(".materialize-textarea");
    M.CharacterCounter.init(elems);
    elems = document.querySelectorAll("select")
    M.FormSelect.init(elems);

    let lang = document.getElementById("lang").innerText;
    let course_selects = {}
    course_selects.preferred = document.getElementById("preferred_course");
    course_selects.disliked = document.getElementById("disliked_course");
    rules.disliked_course.function = check(course_selects);
    rules.preferred_course.function = check(course_selects);

    new window.JustValidate("#register", {
        rules:rules,
        colorWrong: 'red',
        messages:messages[lang]
    })
  });

  function check(selects){
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