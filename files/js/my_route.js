let route_data = null;
let google_loaded = false;

document.addEventListener('DOMContentLoaded', function() {
    fetch("/my/route", {method:"POST"})
    .then(response =>{
        if(response.status == 200){
            response.json()
            .then(json=>{
                route_data = json
                drawMap();
                addRouteInfo();
            })
        }else{
            alert("Etwas schief gelaufen Muss ich noch ändern")
        }
    }).catch(err =>{
        alert(err);
    })
  });

function googleLoaded() {
    google_loaded = true;
    drawMap();
} 

function addRouteInfo(){
    let template = document.getElementById("template");
    let course_template = template.getElementsByClassName('course')[0];
    let adress_template = template.getElementsByClassName('adress')[0];
    let team_template = template.getElementsByClassName('team')[0];
    let members_template = template.getElementsByClassName('member')[0];
    let notes_template = template.getElementsByClassName('notes')[0];
    let container = document.getElementById('container');

    for(let i = 0; i < courses.length; i++){
        let course_template_copy = course_template.cloneNode(true);
        course_template_copy.getElementsByClassName("course")[0].innerText = (i+1) + ". " + translation[courses[i]];
        if(route_data[courses[i]].cook.self){
            let j = 1;
            route_data[courses[i]].teams.forEach(team =>{
                let team_template_copy = createTeam(team.members, translation.team + " " + j, team_template, members_template, notes_template, team.notes)
                course_template_copy.getElementsByClassName("teams_container")[0].appendChild(team_template_copy);
                j++;
            })
        }else{        
            let team_template_copy = createTeam(route_data[courses[i]].cook.contact, translation.cooks, team_template, members_template)
            course_template_copy.getElementsByClassName("teams_container")[0].appendChild(team_template_copy);
            let adress_template_copy = createAdress(route_data[courses[i]].cook.adress, adress_template);
            course_template_copy.getElementsByClassName("adress_container")[0].appendChild(adress_template_copy);

        }
        container.appendChild(course_template_copy);
    }
}

function createAdress(adress, adress_template){
    let adress_template_copy = adress_template.cloneNode(true);
    adress_template_copy.getElementsByClassName("street")[0].innerText += adress.street;
    adress_template_copy.getElementsByClassName("doorbell")[0].innerText += adress.doorbell;
    adress_template_copy.getElementsByClassName("city")[0].innerText += adress.city;
    adress_template_copy.getElementsByClassName("zip")[0].innerText += adress.zip;
    return adress_template_copy;
}

function createTeam(members, title, team_template, members_template, notes_template, notes){
    let team_template_copy = team_template.cloneNode(true);
    if(notes_template && notes){
        let notes_template_copy = notes_template.cloneNode(true);
        notes_template_copy.getElementsByClassName("notes_content")[0].innerText = notes;
        team_template_copy.getElementsByClassName("notes_container")[0].appendChild(notes_template_copy);
    }

    members.forEach(member =>{
        let member_template_copy = members_template.cloneNode(true);
        member_template_copy.getElementsByClassName("first_name")[0].innerText += member.first_name;
        member_template_copy.getElementsByClassName("last_name")[0].innerText += member.last_name;
        member_template_copy.getElementsByClassName("email")[0].innerText += member.email;
        member_template_copy.getElementsByClassName("phone")[0].innerText += member.phone;

        team_template_copy.getElementsByClassName("members_container")[0].appendChild(member_template_copy);
    })

    team_template_copy.getElementsByClassName("team_name")[0].innerText = title;
    return team_template_copy
}

function drawMap(){
    if(google_loaded && route_data){
  
        var map = new google.maps.Map(document.getElementById('map'), {
        zoom: 15,
        center: route_data.map_center
        });
        
        for(let i = 0; i < courses.length; i++){
            var marker = new google.maps.Marker({
                position: route_data[courses[i]].cook.adress.latLng,
                map: map,
                title: courses[i],
                label: (i+1).toString()
                });
        }
    }
}