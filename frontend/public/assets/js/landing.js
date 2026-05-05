"use strict";

/* tooltip */
const tooltipTriggerList = document.querySelectorAll(
  '[data-bs-toggle="tooltip"]'
);
const tooltipList = [...tooltipTriggerList].map(
  (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
);

/* popover  */
const popoverTriggerList = document.querySelectorAll(
  '[data-bs-toggle="popover"]'
);
const popoverList = [...popoverTriggerList].map(
  (popoverTriggerEl) => new bootstrap.Popover(popoverTriggerEl)
);

/* Choices JS */
document.addEventListener("DOMContentLoaded", function () {
  var genericExamples = document.querySelectorAll("[data-trigger]");
  for (let i = 0; i < genericExamples.length; ++i) {
    var element = genericExamples[i];
    new Choices(element, {
      allowHTML: true,
      placeholderValue: "This is a placeholder set in the config",
      searchPlaceholderValue: "Search",
    });
  }
});
/* Choices JS */

//switcher color pickers
const pickrContainerPrimary = document.querySelector(
  ".pickr-container-primary"
);
const themeContainerPrimary = document.querySelector(
  ".theme-container-primary"
);
/* for theme primary */
const nanoThemes = [
  [
    "nano",
    {
      defaultRepresentation: "RGB",
      components: {
        preview: true,
        opacity: false,
        hue: true,

        interaction: {
          hex: false,
          rgba: true,
          hsva: false,
          input: true,
          clear: false,
          save: false,
        },
      },
    },
  ],
];
const nanoButtons = [];
let nanoPickr = null;
for (const [theme, config] of nanoThemes) {
  const button = document.createElement("button");
  button.innerHTML = theme;
  nanoButtons.push(button);

  button.addEventListener("click", () => {
    const el = document.createElement("p");
    pickrContainerPrimary.appendChild(el);

    /* Delete previous instance */
    if (nanoPickr) {
      nanoPickr.destroyAndRemove();
    }

    /* Apply active class */
    for (const btn of nanoButtons) {
      btn.classList[btn === button ? "add" : "remove"]("active");
    }

    /* Create fresh instance */
    nanoPickr = new Pickr(
      Object.assign(
        {
          el,
          theme,
          default: "rgb(84, 109, 254)",
        },
        config
      )
    );

    /* Set events */
    nanoPickr.on("changestop", (source, instance) => {
      let color = instance.getColor().toRGBA();
      let html = document.querySelector("html");
      html.style.setProperty(
        "--primary-rgb",
        `${Math.floor(color[0])}, ${Math.floor(color[1])}, ${Math.floor(
          color[2]
        )}`
      );
      /* theme color picker */
      localStorage.setItem(
        "primaryRGB",
        `${Math.floor(color[0])}, ${Math.floor(color[1])}, ${Math.floor(
          color[2]
        )}`
      );
      updateColors();
    });
  });

  themeContainerPrimary.appendChild(button);
}
nanoButtons[0].click();
/* for theme primary */

/* footer year */
document.getElementById("year").innerHTML = new Date().getFullYear();
/* footer year */

let mainContent;
(function () {
  let html = document.querySelector("html");
  mainContent = document.querySelector(".main-content");

  localStorageBackup();
  switcherClick();
  checkOptions();
  /* LTR to RTL */
  // html.setAttribute("dir" , "rtl") // for rtl version
})();

function switcherClick() {
  let ltrBtn,
    rtlBtn,
    lightBtn,
    darkBtn,
    primaryDefaultColor1Btn,
    primaryDefaultColor2Btn,
    primaryDefaultColor3Btn,
    primaryDefaultColor4Btn,
    primaryDefaultColor5Btn,
    ResetAll;
  let html = document.querySelector("html");
  lightBtn = document.querySelector("#switcher-light-theme");
  darkBtn = document.querySelector("#switcher-dark-theme");
  ltrBtn = document.querySelector("#switcher-ltr");
  rtlBtn = document.querySelector("#switcher-rtl");
  primaryDefaultColor1Btn = document.querySelector("#switcher-primary");
  primaryDefaultColor2Btn = document.querySelector("#switcher-primary1");
  primaryDefaultColor3Btn = document.querySelector("#switcher-primary2");
  primaryDefaultColor4Btn = document.querySelector("#switcher-primary3");
  primaryDefaultColor5Btn = document.querySelector("#switcher-primary4");
  ResetAll = document.querySelector("#reset-all");

  /* Light Layout Start */
  let lightThemeVar = lightBtn.addEventListener("click", () => {
    lightFn();
    localStorage.setItem("zynixHeader", "light");
    localStorage.setItem("zynixMenu", "light");
  });
  /* Light Layout End */

  /* Dark Layout Start */
  let darkThemeVar = darkBtn.addEventListener("click", () => {
    darkFn();
    localStorage.setItem("zynixMenu", "dark");
    localStorage.setItem("zynixHeader", "dark");
  });
  /* Dark Layout End */

  // primary theme
  let primaryColor1Var = primaryDefaultColor1Btn.addEventListener(
    "click",
    () => {
      localStorage.setItem("primaryRGB", "106, 91, 204");
      html.style.setProperty("--primary-rgb", `106, 91, 204`);
      updateColors();
    }
  );
  if(localStorage.primaryRGB == "106, 91, 204"){
    document.querySelector('#switcher-primary').checked = true;
  }
  let primaryColor2Var = primaryDefaultColor2Btn.addEventListener(
    "click",
    () => {
      localStorage.setItem("primaryRGB", "100, 149, 237");
      html.style.setProperty("--primary-rgb", `100, 149, 237`);
      updateColors();
    }
  );
  if(localStorage.primaryRGB == "100, 149, 237"){
    document.querySelector('#switcher-primary1').checked = true;
  }
  let primaryColor3Var = primaryDefaultColor3Btn.addEventListener(
    "click",
    () => {
      localStorage.setItem("primaryRGB", "0, 123, 167");
      html.style.setProperty("--primary-rgb", `0, 123, 167`);
      updateColors();
    }
  );
  if(localStorage.primaryRGB == "0, 123, 167"){
    document.querySelector('#switcher-primary2').checked = true;
  }
  let primaryColor4Var = primaryDefaultColor4Btn.addEventListener(
    "click",
    () => {
      localStorage.setItem("primaryRGB", "10, 180, 255");
      html.style.setProperty("--primary-rgb", `10, 180, 255`);
      updateColors();
    }
  );
  if(localStorage.primaryRGB == "10, 180, 255"){
    document.querySelector('#switcher-primary3').checked = true;
  }
  let primaryColor5Var = primaryDefaultColor5Btn.addEventListener(
    "click",
    () => {
      localStorage.setItem("primaryRGB", "46, 81, 145");
      html.style.setProperty("--primary-rgb", `46, 81, 145`);
      updateColors();
    }
  );
  if(localStorage.primaryRGB == "46, 81, 145"){
    document.querySelector('#switcher-primary4').checked = true;
  }

  /* rtl start */
  let rtlVar = rtlBtn.addEventListener("click", () => {
    localStorage.setItem("zynixrtl", true);
    localStorage.removeItem("zynixltr");
    rtlFn();
  });
  /* rtl end */

  /* ltr start */
  let ltrVar = ltrBtn.addEventListener("click", () => {
    //    local storage
    localStorage.setItem("zynixltr", true);
    localStorage.removeItem("zynixrtl");
    ltrFn();
  });
  /* ltr end */

  // reset all start
  let resetVar = ResetAll.addEventListener("click", () => {
    // clear primary & bg color
    html.style.removeProperty(`--primary-rgb`);

    // clear rtl
    html.removeAttribute("dir", "rtl");
    html.setAttribute("dir", "ltr");

    ResetAllFn();
  });
  // reset all start
}

function ltrFn() {
  let html = document.querySelector("html");
  document
    .querySelector("#style")
    ?.setAttribute("href", "../assets/libs/bootstrap/css/bootstrap.min.css");
  html.setAttribute("dir", "ltr");
  document.querySelector("#switcher-ltr").checked = true;
  checkOptions();
}

function rtlFn() {
  let html = document.querySelector("html");
  html.setAttribute("dir", "rtl");
  document
    .querySelector("#style")
    ?.setAttribute(
      "href",
      "../assets/libs/bootstrap/css/bootstrap.rtl.min.css"
    );
  checkOptions();
}

if (localStorage.zynixrtl) {
  rtlFn();
}

function lightFn() {
  let html = document.querySelector("html");
  html.setAttribute("data-theme-mode", "light");
  document.querySelector("#switcher-light-theme").checked = true;
  updateColors();
  localStorage.removeItem("zynixdarktheme");
  checkOptions();
  // html.style.removeProperty('--primary-rgb');
}

function darkFn() {
  let html = document.querySelector("html");
  html.setAttribute("data-theme-mode", "dark");
  updateColors();
  localStorage.setItem("zynixdarktheme", true);
  localStorage.removeItem("zynixlighttheme");
  checkOptions();
  // html.style.removeProperty("--primary-rgb");
}

function ResetAllFn() {
  let html = document.querySelector("html");
  checkOptions();

  // clearing localstorage
  localStorage.clear();

  // reseting chart colors
  updateColors();

  // reseting rtl
  ltrFn();

  // reseting dark theme
  lightFn();

  // resetting theme primary
  document.querySelector("#switcher-primary").checked = false
  document.querySelector("#switcher-primary1").checked = false
  document.querySelector("#switcher-primary2").checked = false
  document.querySelector("#switcher-primary3").checked = false
  document.querySelector("#switcher-primary4").checked = false
}

function checkOptions() {
  // dark
  if (localStorage.getItem("zynixdarktheme")) {
    document.querySelector("#switcher-dark-theme").checked = true;
  }

  //RTL
  if (localStorage.getItem("zynixrtl")) {
    document.querySelector("#switcher-rtl").checked = true;
  }
}

// chart colors
let myVarVal, primaryRGB;
function updateColors() {
  "use strict";
  primaryRGB = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary-rgb")
    .trim();
}
updateColors();

function localStorageBackup() {
  if (localStorage.primaryRGB) {
    if (document.querySelector(".theme-container-primary")) {
      document.querySelector(".theme-container-primary").value =
        localStorage.primaryRGB;
    }
    document
      .querySelector("html")
      .style.setProperty("--primary-rgb", localStorage.primaryRGB);
  }
  if (localStorage.zynixdarktheme) {
    let html = document.querySelector("html");
    html.setAttribute("data-theme-mode", "dark");
  }

  if (localStorage.zynixrtl) {
    let html = document.querySelector("html");
    html.setAttribute("dir", "rtl");
  }
  if (localStorage.zynixlayout) {
    let html = document.querySelector("html");
    let layoutValue = localStorage.getItem("zynixlayout");
    html.setAttribute("data-nav-layout", "horizontal");
  }
}
// section menu active
function onScroll(event) {
  const sections = document.querySelectorAll(".side-menu__item");
  const scrollPos =
    window.pageYOffset ||
    document.documentElement.scrollTop ||
    document.body.scrollTop;

  sections.forEach((elem) => {
    const val = elem.getAttribute("href");
    let refElement;
    if (val != "javascript:void(0);" && val !== "#") {
      refElement = document.querySelector(val);
    }
    const scrollTopMinus = scrollPos + 73;
    if (
      refElement?.offsetTop <= scrollTopMinus &&
      refElement?.offsetTop + refElement.offsetHeight > scrollTopMinus
    ) {
      if (elem.parentElement.parentElement.classList.contains("child1")) {
        elem.parentElement.parentElement.parentElement.children[0].classList.add(
          "active"
        );
      }
      elem.classList.add("active");
      if (elem.closest(".child1")?.previousElementSibling) {
        elem.closest(".child1").previousElementSibling.classList.add("active");
      }
    } else {
      elem.classList.remove("active");
    }
  });
}
window.document.addEventListener("scroll", onScroll);
// for menu target scroll on click

/* back to top */
const scrollToTop = document.querySelector(".scrollToTop");
const $rootElement = document.documentElement;
const $body = document.body;
window.onscroll = () => {
  const scrollTop = window.scrollY || window.pageYOffset;
  const clientHt = $rootElement.scrollHeight - $rootElement.clientHeight;
  if (window.scrollY > 100) {
    scrollToTop.style.display = "flex";
  } else {
    scrollToTop.style.display = "none";
  }
};
scrollToTop.onclick = () => {
  window.scrollTo(0, 0);
};
/* back to top */

 /* testimonial swiper service start */
 var swiper = new Swiper(".testimonialSwiperService", {
  slidesPerView: 2,
  spaceBetween: 30,
  loop: true,
  loopFillGroupWithBlank: true,
  pagination: {
      el: ".swiper-pagination",
      dynamicBullets: true,
      clickable: true,
  },
  autoplay: {
    delay: 3000,
    disableOnInteraction: false,
  },
  breakpoints: {
    "@0.00": {
      slidesPerView: 1,
      spaceBetween: 10,
    },
    "@0.75": {
      slidesPerView: 2,
      spaceBetween: 20,
    },
  },
});
/* testimonial swiper service start */
