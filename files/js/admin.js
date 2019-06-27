import {rules, messages} from "./form_rules/admin_rules.js"

const solver_states = {
    undefined: 0,
    running: 1,
    finished: 2,
    error: 3
}

let solver_state = solver_states.undefined;

document.addEventListener('DOMContentLoaded', function() {

    let saved = document.getElementById("saved");
    let not_saved = document.getElementById("not_saved");
    let layout_helper = document.getElementById("helper");
    updateLog();
    updateSolverState();

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
                        window.location.href="/timed/out";
                    }
                }
            })
        }
    });

    var table = new Tabulator("#users", {
        height:"500",
        layout:"fitColumns",
        columns:columns
    });

    getUserInfo(table);
})

window.startRouting = ()=>{
    fetch("/start/routing", {method:"POST"})
    .then(response =>{
        if (response.status === 200) {
            document.getElementById("start_routing").classList.add("disabled");
            let div = document.getElementById("log");
            div.innerHTML = "";
            div.style.borderWidth = "0px";
            solver_state = solver_states.running;
            document.getElementById("ok").style.display = "none";
            document.getElementById("error").style.display = "none";

            let log_interval = setInterval(updateLog, 1000);
            let state_interval = setInterval(updateSolverState, 1000);
            let check_interval = setInterval(()=>{
                if(solver_state != solver_states.running){
                    clearInterval(log_interval);
                    clearInterval(state_interval);
                    clearInterval(check_interval);
                }
            }, 1000)
        }else if(response.status === 401){
            window.location.href="/timed/out";
        } else {
          alert('There was a problem with the request.');
        }
    }).catch(err =>{
        alert(err);
    })
}

function updateLog(){
    fetch("/get/log", {method:"POST"})
    .then(response =>{
        if(response.status == 200){
            let div = document.getElementById("log")

            response.text()
            .then(text =>{
                div.innerText = text;
            })
        }else if(response.status == 401){
            window.location.href="/timed/out";
        }else{
            alert('There was a problem with the connection.');
        }
    }).catch(err=>{
        alert(err);
    })
}

function updateSolverState(){
    fetch("/get/solver/state", {method:"POST"})
    .then(response=>{
        if(response.status == 200){
            response.text()
            .then(state =>{
                solver_state = state;
                let div = document.getElementById("log");

                if(solver_state == solver_states.finished){
                    div.style.borderWidth = "2px";
                    div.style.borderColor = "green";
                    document.getElementById("ok").style.display = "block";
                    document.getElementById("start_routing").classList.remove("disabled");
                }else if(solver_state == solver_states.error){
                    div.style.borderWidth = "2px";
                    div.style.borderColor = "red";
                    document.getElementById("error").style.display = "block";
                    document.getElementById("start_routing").classList.remove("disabled");
                }else if(solver_state == solver_states.running){
                    document.getElementById("start_routing").classList.add("disabled");
                }
            })
        }else if(response.status == 401){
            window.location.href="/timed/out";
        }else{
            alert('There was a problem with the connection.');
        }
    }).catch(err=>{
        alert(err);
    })
}

let team_count_text = '';

function getUserInfo(table){
    fetch("/get/users", {method:"POST"})
    .then(response=>{
        if(response.status == 200){
            response.json()
            .then(data =>{
               table.setData(data.users);
               let span = document.getElementById("team_count")
               if(team_count_text == ''){
                    team_count_text = span.innerText + " ";
               }
               span.innerText = team_count_text + data.confirmed_teams;
            })
        }else if(response.status == 401){
            window.location.href="/timed/out";
        }else{
            alert('There was a problem with the connection.');
        }
    }).catch(err=>{
        alert(err);
    })
}