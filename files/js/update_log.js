window.onload = ()=>{
    updateLog()
    let intervalId = setInterval(updateLog, 5000)
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
    console.log(div.scrollTop)
}