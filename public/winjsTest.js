(function() {
    WinJS.Namespace.define("MotionPi", {
        mode: {
            small: {
                name: 'small',
                openedDisplayMode: WinJS.UI.SplitView.OpenedDisplayMode.overlay,
                closedDisplayMode: WinJS.UI.SplitView.ClosedDisplayMode.none,
            },
            medium: {
                name: 'medium',
                openedDisplayMode: WinJS.UI.SplitView.OpenedDisplayMode.overlay,
                closedDisplayMode: WinJS.UI.SplitView.ClosedDisplayMode.inline,
            },
            large: {
                name: 'large',
                openedDisplayMode: WinJS.UI.SplitView.OpenedDisplayMode.inline,
                closedDisplayMode: WinJS.UI.SplitView.ClosedDisplayMode.inline,
            }
        },
        splitView: null,
        radioChanged: WinJS.UI.eventHandler(function (ev) {
            var mode = event.target.value;
            MotionPi.updateSplitView(mode);
        }),
        
        dateSelection: WinJS.UI.eventHandler(function (ev) {
            var date = event.target.innerText.trim();
            var base = 'http://localhost:8080';
            var url = base+'/api/motion/fetch/' + date;
            return WinJS.xhr({ url: url }).then(function(res) {
                var data = res;
                // var data = …; // processing the request
                // return data;
            });
        }),
        
        updateSplitView: function (size) {
            // Remove all the size classes
            Object.keys(MotionPi.mode).forEach(function (key) {
                WinJS.Utilities.removeClass(MotionPi.host, MotionPi.mode[key].name);
            });
            
            // Update the SplitView based on the size
            MotionPi.splitView.openedDisplayMode = MotionPi.mode[size].openedDisplayMode;
            MotionPi.splitView.closedDisplayMode = MotionPi.mode[size].closedDisplayMode;

            // Add the size class
            WinJS.Utilities.addClass(MotionPi.host, size);
        }
    });
    
    
     
    document.addEventListener("DOMContentLoaded", function() {
        WinJS.Binding.processAll(null, MotionPi).then(function() {
            WinJS.UI.processAll().done(function () {
                MotionPi.splitView = document.querySelector(".splitView").winControl;
                MotionPi.host = document.querySelector("#app");

                // Temporary workaround: Draw keyboard focus visuals on NavBarCommands
                new WinJS.UI._WinKeyboard(MotionPi.splitView.paneElement);
            });
     })}, false);
})();
    