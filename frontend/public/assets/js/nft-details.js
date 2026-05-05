(function () {
    'use strict';

    var swiper = new Swiper(".swiper-view-details", {
        spaceBetween: 10,
        slidesPerView: 4,
        freeMode: true,
        watchSlidesProgress: true,
    });
    var swiper2 = new Swiper(".swiper-preview-details", {
        spaceBetween: 10,
        navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
        },
        thumbs: {
            swiper: swiper,
        }
    });

    
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