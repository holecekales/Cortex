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
    NavBar.prototype.loadPage = function (url, elem, viewConstructor) {
        var _this = this;
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function (e) {
            if (xhr.readyState == 4 && xhr.status == 200) {
                elem.innerHTML = xhr.responseText;
                console.log('load finished: ' + url);
                if (_this.view !== null) {
                    _this.view.close();
                    _this.view = null;
                }
                if (viewConstructor) {
                    _this.view = new window[viewConstructor]();
                    _this.view.init();
                }
            }
        };
        xhr.open("GET", url, true);
        xhr.setRequestHeader('Content-type', 'text/html');
        xhr.send();
    };
    // ---------------------------------------------------------
    NavBar.prototype.switchPage = function (target) {
        var ca = $(this.id + ' li a.active');
        var t = target || null;
        if (t && ca == t)
            return;
        if (ca && t && ca != t)
            (ca).classList.remove('active');
        if (t == null)
            t = ca;
        t.classList.add('active');
        // add it to the one which is getting clicked
        this.loadPage(t.getAttribute('url'), $('#content'), t.getAttribute('view'));
    };
    // ---------------------------------------------------------
    NavBar.prototype.handleClick = function (e) {
        this.switchPage(e.target);
        e.preventDefault();
    };
    return NavBar;
}());
