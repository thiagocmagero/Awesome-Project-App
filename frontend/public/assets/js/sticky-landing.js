
"use strict";
(() => {
  window.addEventListener('scroll', stickyFn);

  var navbar = document.getElementById("sidebar");
  var navbar1 = document.getElementById("header");

  function stickyFn() {
    if (window.scrollY >= 75) {
      navbar.classList.add("sticky-pin");
      if (navbar1) { // Check if navbar1 exists
        navbar1.classList.add("sticky-pin");
      }
    } else {
      navbar.classList.remove("sticky-pin");
      if (navbar1) { // Check if navbar1 exists
        navbar1.classList.remove("sticky-pin");
      }
    }
  }

  window.addEventListener('DOMContentLoaded', stickyFn);
})();

