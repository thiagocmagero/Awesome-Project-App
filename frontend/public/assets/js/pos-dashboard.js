
/* For Card Active */
document.addEventListener('DOMContentLoaded', function() {
    var cards = document.querySelectorAll('.card.custom-card');
    cards.forEach(function(card) {
        card.addEventListener('click', function() {
            cards.forEach(function(c) {
                c.classList.remove('active');
            });
            card.classList.add('active');
        });
    });
});
/* For Card Active */

/* Isotope Layout Js */
// document.addEventListener("DOMContentLoaded", function (e) { 
    var listWrapper = document.querySelector(".list-wrapper");
    var isotope;
    console.log("listWrapper",listWrapper);
    if (listWrapper) {
        setTimeout(() => {
            isotope = new Isotope(listWrapper, {
                itemSelector: ".card-item",
                // layoutMode: 'fitRows',
            });
        }, 100);
    }
    var categoriesFilter = document.querySelectorAll(".pos-category");
    if (categoriesFilter.length > 0) {
        categoriesFilter.forEach(function (filter) {
            filter.addEventListener("click", function (event) {
                if (event.target.matches(".categories")) {
                    var filterValue = event.target.getAttribute("data-filter");
                    if (filterValue) {
                        isotope.arrange({ filter: filterValue});
                    }
                }
            });
        });
    }
// });
/* Isotope layout Js */

document.querySelector("#switcher-rtl").addEventListener("click",()=>{
    var listWrapper = document.querySelector(".list-wrapper");
    var isotope;
    console.log("listWrapper",listWrapper);
    if (listWrapper) {
        setTimeout(() => {
            isotope = new Isotope(listWrapper, {
                itemSelector: ".card-item",
                // layoutMode: 'fitRows',
            });
        }, 100);
    }
    var categoriesFilter = document.querySelectorAll(".pos-category");
    if (categoriesFilter.length > 0) {
        categoriesFilter.forEach(function (filter) {
            filter.addEventListener("click", function (event) {
                if (event.target.matches(".categories")) {
                    var filterValue = event.target.getAttribute("data-filter");
                    if (filterValue) {
                        isotope.arrange({ filter: filterValue,
                        originLeft: false, });
                    }
                }
            });
        });
    }
})



document.querySelectorAll("#switcher-boxed , #switcher-full-width ,#switcher-default-width").forEach((element)=>{
    element.addEventListener("click",()=>{
        setTimeout(() => {
            new Isotope(document.querySelector(".list-wrapper"), {
                itemSelector: ".card-item",
            });
        }, 100);
    })
})
