(function () {
    "use strict";

    /* Attendance Report */
    var options = {
        series: [{
            name: "Teachers",
            type: "column",
            data: [44, 55, 41, 42, 22, 43, 21, 35, 56, 27, 43, 27]
        }, {
            name: "Boys",
            type: "column",
            data: [33, 21, 32, 37, 23, 32, 47, 31, 54, 32, 20, 38]
        }, {
            name: "Girls",
            type: "line",
            data: [30, 25, 36, 30, 45, 35, 64, 51, 59, 36, 39, 51]
        }],
        chart: {
            height: 265,
            fontFamily: 'Poppins, Arial, sans-serif',
            type: "line",
            stacked: false,
            toolbar: {
                show: false
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            width: [2, 2, 1.5],
            show: true,
            curve: 'smooth',
            lineCap: 'butt',
            dashArray: [0, 0, 2]
        },
        grid: {
            show: false,
            borderColor: '#f3f3f3',
            strokeDashArray: 3
        },
        plotOptions: {
            bar: {
                columnWidth: "35%",
                borderRadius: 3,
            }
        },
        legend: {
            show: false
        },
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        markers: {
            size: 0
        },
        colors: ["var(--primary-color)", "var(--primary02)", "rgb(255, 90, 41)"],

    };
    var chart1 = new ApexCharts(document.querySelector("#attendance-report"), options);
    chart1.render();
    /* Attendance Report */

    /* Students statistics */
    var options = {
        series: [
            {
                name: "Girls",
                data: [44, 42, 57, 86, 58, 55, 45],
            },
            {
                name: "Boys",
                data: [-34, -22, -37, -56, -21, -35, -34],
            },
        ],
        chart: {
            stacked: true,
            type: "bar",
            height: 350,
            toolbar: {
                show: false,
            },
        },
        grid: {
            borderColor: "#f1f1f1",
            strokeDashArray: 2,
            xaxis: {
                lines: {
                    show: true
                }
            },
            yaxis: {
                lines: {
                    show: false
                }
            }
        },
        colors: ["var(--primary09)", "rgba(255, 90, 41, 0.9) "],
        plotOptions: {
            bar: {
                borderRadius: 2,
                borderRadiusApplication: "end",
                borderRadiusWhenStacked: "all",
                columnWidth: "25%",
            },
        },
        dataLabels: {
            enabled: false,
        },
        legend: {
            show: true,
            position: "top",
            fontFamily: "Mulish",
            markers: {
                size: 4,
                strokeWidth: 0,
                strokeColor: '#fff',
                fillColors: undefined,
                radius: 5,
                customHTML: undefined,
                onClick: undefined,
                offsetX: 0,
                offsetY: 0
              },
        },
        yaxis: {
            show: false,
            axisBorder: {
                show: false,
            },
            axisTicks: {
                show: false,
            }
        },
        xaxis: {
            type: "month",
            categories: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
            axisBorder: {
                show: false,
            },
            axisTicks: {
                show: false,
            },
            labels: {
                rotate: -90,
            },
        },
    };
    var chart = new ApexCharts(document.querySelector("#students-overview"), options);
    chart.render();
    /* Students statistics */

    /* For Inline Calendar */
    flatpickr("#Eventscalendar", {
        inline: true,
    });
    /* For Inline Calendar */

})();