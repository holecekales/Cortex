var nav = null;

// ---------------------------------------------------------
function $(id: string): HTMLElement {
  return <HTMLElement>document.querySelector(id);
}

// ---------------------------------------------------------
(function () {
  document.addEventListener("DOMContentLoaded", (e) => {
    nav = new NavBar('#header');
    nav.activateButton(0);
  });
})();