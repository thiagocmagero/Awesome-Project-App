(function () {
    'use strict';

    // swiper with navigation
    var swiper = new Swiper(".swiper-related-jobs", {
      slidesPerView: 1,
        navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
        },
        loop: true,
        autoplay: {
            delay: 1500,
            disableOnInteraction: false,
        },
    });

})();