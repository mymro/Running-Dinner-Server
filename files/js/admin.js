import {rules, messages} from "./form_rules/admin_rules.js"
document.addEventListener('DOMContentLoaded', function() {

    let saved = document.getElementById("saved");
    let not_saved = document.getElementById("not_saved");
    let timed_out = document.getElementById("timed_out");
    let layout_helper = document.getElementById("helper");
    updateLog();

    new window.JustValidate("#settings", {
        rules:rules,
        colorWrong: 'red',
        messages:messages[layout.lang],
        submitHandler: function (form, values, ajax) {
            saved.style.display = "none";
            not_saved.style.display = "none";
            layout_helper.style.display = "block"

            ajax({
              url: '/change/settings',
              method: 'POST',
              data: values,
              async: true,
                callback:(response)=>{
                    saved.style.display = "block";
                    not_saved.style.display = "none";
                    layout_helper.style.display = "none";
                },
                error:(err)=>{
                    if(err != "Unauthorized"){
                        saved.style.display = "none";
                        not_saved.style.display = "block";
                        layout_helper.style.display = "none";
                    }else{
                        timed_out.style.display = "block";
                        saved.style.display = "none";
                        not_saved.style.display = "none";
                        layout_helper.style.display = "none";
                        window.scrollTo(0, 0);
                    }
                }
            })
        }
    });
})

window.startRouting = ()=>{
    fetch("/start/routing", {method:"POST"})
    .then(response =>{
        if (response.status === 200) {
            document.getElementById("log").innerHTML = "";
            let intervalId = setInterval(updateLog, 1000)
        }else if(response.status === 401){
            document.getElementById("timed_out").style.display = "block";
            window.scrollTo(0, 0);
        } else {
          alert('There was a problem with the request.');
        }
    }).catch(err =>{
        alert(err);
    })
}

function updateLog(){
    let div = document.getElementById("log")

    fetch("/get_log", {method:"POST"})
    .then(response =>{
        return response.text()
    }).then(text =>{
        div.innerText = text
    })
    div.scrollTop = div.scrollHeight
}