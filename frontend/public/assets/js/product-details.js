(function () {
    'use strict';

    var value = 1,
    minValue = 0,
    maxValue = 30;

let productMinusBtn = document.querySelectorAll(".product-quantity-minus")
let productPlusBtn = document.querySelectorAll(".product-quantity-plus")
productMinusBtn.forEach((element) => {
    element.onclick = () => {
        value = Number(element.parentElement.childNodes[3].value)
        if (value > minValue) {
            value = Number(element.parentElement.childNodes[3].value) - 1;
            element.parentElement.childNodes[3].value = value;
        }
    }
})
productPlusBtn.forEach((element) => {
    element.onclick = () => {
        if (value < maxValue) {
            value = Number(element.parentElement.childNodes[3].value) + 1;
            element.parentElement.childNodes[3].value = value;
        }
    }
})

    var swiper = new Swiper(".swiper-view-details", {
        spaceBetween: 10,
        slidesPerView: 4,
        freeMode: true,
        watchSlidesProgress: true,
    });
    var swiper2 = new Swiper(".swiper-preview-details", {
        spaceBetween: 20,
        navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
        },
        thumbs: {
            swiper: swiper,
        }
    });

     // vertical swiper
     var swiper = new Swiper(".swiper-vertical", {
        direction: "vertical",
        slidesPerView: 2,
        pagination: {
            el: ".swiper-pagination",
            clickable: true,
        },
        loop: true,
        autoplay: {
            delay: 1500,
            disableOnInteraction: false
        },
    });

      // swiper with navigation
      var swiper = new Swiper(".swiper-related-products", {
        navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
        },
        loop: true,
        autoplay: {
            delay: 2500,
            disableOnInteraction: false,
        }
    });

})();