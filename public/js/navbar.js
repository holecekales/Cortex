// ---------------------------------------------------------
// class SimpleNavBar 
// ---------------------------------------------------------
var NavBar = (function () {
    function NavBar(id) {
        var _this = this;
        this.id = id;
        this.view = null;
        // register click handlers on all <a>s 
        var buttons = document.querySelectorAll('#header li a');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener('click', function (e) {
                _this.handleClick(e);
            }, true);
        }
    }
    NavBar.prototype.getView = function () { return this.view; };
    // ---------------------------------------------------------
    NavBar.prototype.loadPage = function (url, elem) {
        var _this = this;
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function (e) {
            if (xhr.readyState == 4 && xhr.status == 200) {
                elem.innerHTML = xhr.responseText;
                _this.view = new Pump();
                _this.view.init();
            }
        };
        xhr.open("GET", url, true);
        xhr.setRequestHeader('Content-type', 'text/html');
        xhr.send();
    };
    // ---------------------------------------------------------
    NavBar.prototype.activateButton = function (n) {
        var buttons = document.querySelectorAll('#header li a');
        if (n < buttons.length) {
            var ca = $(this.id + ' li a.active');
            if (ca)
                (ca).classList.remove('active');
            var target = (buttons[n]);
            target.classList.add('active');
            // add it to the one which is getting clicked
            this.loadPage(target.getAttribute('url'), $('#content'));
        }
    };
    // ---------------------------------------------------------
    NavBar.prototype.handleClick = function (e) {
        // remove the active style from the current element
        var ca = $(this.id + ' li a.active');
        if (ca)
            (ca).classList.remove('active');
        var target = (e.target);
        target.classList.add('active');
        // add it to the one which is getting clicked
        e.preventDefault();
        console.log(target.getAttribute('url'));
        this.loadPage(target.getAttribute('url'), $('#content'));
    };
    return NavBar;
}());
