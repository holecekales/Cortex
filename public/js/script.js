// this is the array 
var itemArray = []; 
var apiURL = '/api/motion/';

function generateItems(date) {
    return WinJS.xhr({ url: apiURL, responseType: 'json' })
};

function getData() {
    Sample.ListView.generate().then(function(xhr) {
        var items = xhr.response;
        
        items.forEach(function (item) {
            Sample.ListView.data.push(item);
        });
        counter.innerText = Sample.ListView.data.length;
    });
}

function selectDateFunc(eventInfo) {
    console.log(this.textContent);
}

WinJS.Namespace.define("Sample.ListView", {
    generate: generateItems,
    data: new WinJS.Binding.List(itemArray),
    itemCount: itemArray.length,
    selectDate: selectDateFunc,
    eh: {
        footerVisibility: WinJS.UI.eventHandler(function (ev) {
            // var visible = ev.detail.visible;
            // if (visible) {
            //     WinJS.Utilities.removeClass(Sample.ListView.progress, "hide");
            //      WinJS.UI.Animation.fadeIn(Sample.ListView.status);
            //      // getData();
            // } else {
            //     WinJS.Utilities.addClass(Sample.ListView.progress, "hide");
            // }
        })
    }
});

WinJS.UI.processAll().done(function () {
        // Cache ListView and Header elements
        Sample.ListView.listView = document.querySelector(".listView");
        Sample.ListView.counter = document.querySelector("#counter");
        Sample.ListView.status = document.querySelector(".footer .status");
        Sample.ListView.progress = document.querySelector(".footer .progress");
        Sample.ListView.footer = document.querySelector(".footer");

        var splitView = document.querySelector(".splitView").winControl;
        splitView.openedDisplayMode = WinJS.UI.SplitView.OpenedDisplayMode.overlay; 
        splitView.closedDisplayMode = WinJS.UI.SplitView.ClosedDisplayMode.none;
        
        var commands = document.querySelector(".nav-commands").children;
        var len = commands.length;
        for (var i = 0; i< len; i++) {
            commands[i].winControl.addEventListener("invoked", selectDateFunc);
        }
        
        new WinJS.UI._WinKeyboard(splitView.paneElement); // Temporary workaround: Draw keyboard focus visuals on NavBarCommands
        WinJS.Binding.processAll(Sample.ListView.counter, Sample.ListView).then(function() {
           getData();
        });
});


