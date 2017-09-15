var nav = null;
// ---------------------------------------------------------
function $(id) {
    return document.querySelector(id);
}
// ---------------------------------------------------------
(function () {
    document.addEventListener("DOMContentLoaded", function (e) {
        nav = new NavBar('#header');
        nav.activateButton(0);
    });
})();
