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
