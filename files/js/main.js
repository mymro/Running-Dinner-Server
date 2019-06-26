var layout = {};

document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.sidenav');
    layout.sidenavs = M.Sidenav.init(elems);
    elems = document.querySelectorAll(".materialize-textarea");
    layout.textareas = M.CharacterCounter.init(elems);
    elems = document.querySelectorAll("select")
    layout.selects = M.FormSelect.init(elems);
    layout.lang = document.getElementById("lang").innerText;
  });

function logout(){
  document.cookie = "auth= ; expires=Thu, 1 Jan 2000 12:00:00 UTC";
  window.location.href = "/";
}
