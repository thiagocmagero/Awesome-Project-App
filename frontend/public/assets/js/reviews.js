(function () {
    "use strict";

    /* testimonialSwiper start */
    var swiper = new Swiper(".testimonialSwiperbasic", {
        slidesPerView: 2,
        spaceBetween: 30,
        loop: true,
        loopFillGroupWithBlank: true,
        pagination: {
            el: ".swiper-pagination",
            clickable: true,
        },
        autoplay: {
            delay: 3000,
            disableOnInteraction: false,
        },
        breakpoints: {
            320: {
                slidesPerView: 1,
                spaceBetween: 10,
            },
            640: {
              slidesPerView: 1,
              spaceBetween: 20,
            },
            768: {
              slidesPerView: 2,
              spaceBetween: 20,
            },
            1400: {
              slidesPerView: 4,
              spaceBetween: 20,
            },
          },
    });
    /* testimonialSwiper end */

    /* testimonialSwiper1 start */
    var swiper = new Swiper(".testimonialSwiper1", {
        slidesPerView: 2,
        spaceBetween: 30,
        loop: true,
        loopFillGroupWithBlank: true,
        pagination: {
            el: ".swiper-pagination",
            clickable: true,
        },
        autoplay: {
            delay: 3000,
            disableOnInteraction: false,
        },
        breakpoints: {
            320: {
                slidesPerView: 1,
                spaceBetween: 10,
            },
            640: {
              slidesPerView: 1,
              spaceBetween: 20,
            },
            768: {
              slidesPerView: 3,
              spaceBetween: 20,
            },
            1400: {
              slidesPerView: 4,
              spaceBetween: 20,
            },
          },
    });
    /* testimonialSwiper1 end */

    /* testimonialSwiper3 Start */
    var swiper4 = new Swiper(".testimonialSwiper2", {
        slidesPerView: 2,
        spaceBetween: 30,
        loop: false,
        loopFillGroupWithBlank: true,
        pagination: {
            el: ".swiper-pagination",
            clickable: true,
        },
        navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
        },
        autoplay: {
            enabled: false,
            delay: 2000,
            disableOnInteraction: false,
        },
        breakpoints: {
            320: {
                slidesPerView: 1,
                spaceBetween: 10,
            },
            480: {
                slidesPerView: 1,
                spaceBetween: 10,
            },
            1112: {
                slidesPerView: 3,
                spaceBetween: 10,
            },
            1300: {
                slidesPerView: 4,
                spaceBetween: 30,
            }
        },
    });
    /* testimonialSwiper3 End */

    /* testimonial swiper service start */
    var swiper = new Swiper(".testimonialSwiperService", {
        slidesPerView: 3,
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
            320: {
                slidesPerView: 1,
                spaceBetween: 10,
            },
            480: {
                slidesPerView: 1,
                spaceBetween: 10,
            },
            1112: {
                slidesPerView: 3,
                spaceBetween: 10,
            },
            1300: {
                slidesPerView: 3,
                spaceBetween: 30,
            }
        },
    });
    /* testimonial swiper service start */
    
    /* testimonial swiper service1 start */
    var swiper = new Swiper(".testimonialSwiperService1", {
        slidesPerView: 3,
        spaceBetween: 30,
        loop: true,
        watchSlidesProgress: true,
        loopFillGroupWithBlank: true,
        freeMode: true,
        autoplay: {
            delay: 3000,
            disableOnInteraction: false,
        },
        breakpoints: {
            320: {
                slidesPerView: 1,
                spaceBetween: 10,
            },
            480: {
                slidesPerView: 1,
                spaceBetween: 10,
            },
            1112: {
                slidesPerView: 3,
                spaceBetween: 10,
            },
            1300: {
                slidesPerView: 3,
                spaceBetween: 30,
            }
        },
    });
    /* testimonial swiper service1 start */

})();