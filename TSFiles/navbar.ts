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
  loadPage(url: string, elem: HTMLElement, viewConstructor) {
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
  activateButton(n: number) {
    let buttons = document.querySelectorAll('#header li a');
    if (n < buttons.length) {
      let ca = $(this.id + ' li a.active');
      if (ca)
        (<HTMLElement>(ca)).classList.remove('active');

      let target: HTMLElement = <HTMLElement>(buttons[n]);
      target.classList.add('active');
      // add it to the one which is getting clicked
      this.loadPage(target.getAttribute('url'), $('#content'), target.getAttribute('view'));
    }
  }

  // ---------------------------------------------------------
  handleClick(e) {
    // remove the active style from the current element
    let ca = $(this.id + ' li a.active');
    if (ca)
      (<HTMLElement>(ca)).classList.remove('active');

    let target: HTMLElement = <HTMLElement>(e.target);
    target.classList.add('active');
    // add it to the one which is getting clicked
    e.preventDefault();
    console.log(target.getAttribute('url'));
    this.loadPage(target.getAttribute('url'), $('#content'), target.getAttribute('view'));
  }
}
