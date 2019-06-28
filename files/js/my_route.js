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