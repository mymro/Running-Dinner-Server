function checkRegisterForm(){
    let form = document.getElementById("register");

    if(form["password"].value == form["repeat_password"].value
        && form["email"].value != ""){
        return true;
    }else{
        return false;
    }
}