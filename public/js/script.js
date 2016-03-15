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

WinJS.Namespace.define("Sample.ListView", {
    generate: generateItems,
    data: new WinJS.Binding.List(itemArray),
    itemCount: itemArray.length,
    eh: {
        footerVisibility: WinJS.UI.eventHandler(function (ev) {
            var visible = ev.detail.visible;
            if (visible) {
                WinJS.Utilities.removeClass(Sample.ListView.progress, "hide");
                 WinJS.UI.Animation.fadeIn(Sample.ListView.status);
                 // getData();
            } else {
                WinJS.Utilities.addClass(Sample.ListView.progress, "hide");
            }
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
        new WinJS.UI._WinKeyboard(splitView.paneElement); // Temporary workaround: Draw keyboard focus visuals on NavBarCommands
        WinJS.Binding.processAll(Sample.ListView.counter, Sample.ListView).then(function() {
           getData();
        });
});


