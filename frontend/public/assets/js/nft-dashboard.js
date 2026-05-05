(function () {
    "use strict";

    /* Nft Statistics */
    var options = {
        series: [
            {
                name: 'Views',
                type: 'column',
                data: [53, 61, 42, 57, 33, 42, 57, 31, 64, 72, 45, 35]
            },
            {
                name: 'Followers',
                type: 'line',
                data: [24, 50, 31, 57, 32, 63, 31, 51, 26, 47, 23, 47]
            },
        ],
        chart: {
            toolbar: {
                show: false
            },
            type: 'line',
            height: 283,
        },
        grid: {
            borderColor: '#f1f1f1',
            strokeDashArray: 3
        },
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        dataLabels: {
            enabled: false
        },
        stroke: {
            width: [1, 2],
            curve: ['straight', 'smooth'],
        },
        legend: {
            show: false,
            position: 'top',
        },
        xaxis: {
            axisBorder: {
                color: '#e9e9e9',
            },
        },
        plotOptions: {
            bar: {
                columnWidth: "20%",
                borderRadius: 2
            }
        },
        colors: ["var(--primary-color)", "rgb(255, 90, 41)"],
    };
    var chart2 = new ApexCharts(document.querySelector("#nft-statistics"), options);
    chart2.render();
    /* Nft Statistics */

    // for featured collections
    var swiper = new Swiper(".pagination-dynamic", {
        pagination: {
            el: ".swiper-pagination",
            dynamicBullets: true,
            clickable: true,
        },
        loop: true,
        autoplay: {
            delay: 1500,
            disableOnInteraction: false
        }
    });
    // for featured collections

})();