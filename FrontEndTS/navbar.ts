// ---------------------------------------------------------
// class SimpleNavBar 
// ---------------------------------------------------------
class NavBar {

  private view = null;


  constructor(private id: string) {

    // register click handlers on all <a>s 
    let buttons = document.querySelectorAll('#header li a');
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', (e: Event) => {
        this.handleClick(e);
      }, true);
    }
  }

  getView() { return this.view; }

  // ---------------------------------------------------------
  loadPage(url: string, elem: HTMLElement, viewConstructor: string) {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange =  (e) => {
      if (xhr.readyState == 4 && xhr.status == 200) {
        elem.innerHTML = xhr.responseText;
        console.log('load finished: ' + url);

        if(this.view !== null) {
          this.view.close();
          this.view = null;
        }

        if(viewConstructor) {
          this.view = new window[viewConstructor]();
          this.view.init();
        }
      }
    }
    xhr.open("GET", url, true);
    xhr.setRequestHeader('Content-type', 'text/html');
    xhr.send();
  }

  // ---------------------------------------------------------
  switchPage(target? : HTMLElement) {
    let ca = $(this.id + ' li a.active');
    let t = target || null; 

    if(t && ca == t)
      return;

    if (ca && t && ca != t) 
      (<HTMLElement>(ca)).classList.remove('active');

    if(t == null) 
      t = ca;

    t.classList.add('active');
    // add it to the one which is getting clicked
    this.loadPage(t.getAttribute('url'), $('#content'), t.getAttribute('view'));
  }

  // ---------------------------------------------------------
  handleClick(e) {
    this.switchPage(e.target);
    e.preventDefault();
  }
}
