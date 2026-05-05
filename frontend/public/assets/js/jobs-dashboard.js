(function () {
    "use strict";

    /* Candidates Chart */
    var options = {
        series: [1200, 750],
        labels: ["Female", "Male"],
        chart: {
            height: 270,
            type: 'donut',
        },
        dataLabels: {
            enabled: false,
        },

        legend: {
            show: false,
        },
        stroke: {
            show: true,
            curve: 'smooth',
            lineCap: 'round',
            colors: "#fff",
            width: 2,
            dashArray: 0,
        },
        plotOptions: {
            pie: {
                expandOnClick: false,
                donut: {
                    size: '85%',
                    background: 'transparent',
                    labels: {
                        show: true,
                        name: {
                            show: true,
                            fontSize: '20px',
                            color: '#495057',
                            fontFamily: "Montserrat, sans-serif",
                            offsetY: 0
                        },
                        value: {
                            show: true,
                            fontSize: '22px',
                            color: undefined,
                            offsetY: 10,
                            fontWeight: 600,
                            fontFamily: "Montserrat, sans-serif",
                            formatter: function (val) {
                                return val + "%"
                            }
                        },
                        total: {
                            show: true,
                            showAlways: true,
                            label: 'Total Visitors',
                            fontSize: '14px',
                            fontWeight: 400,
                            color: '#495057',
                            formatter: function (w) {
                                return 1950
                            }
                        }
                    }
                }
            }
        },

        colors: ["var(--primary-color)", "rgb(255, 90, 41)"],

    };
    var chart = new ApexCharts(document.querySelector("#candidates"), options);
    chart.render();
    /* Candidates Chart */

    /* Job Statistics */
    var options = {
        series: [{
            name: "Employers",
            data: [20, 38, 38, 72, 55, 63, 43, 76, 55, 80, 40, 80],
            type: 'line',
        }, {
            name: "Candidates",
            data: [85, 65, 75, 38, 85, 35, 62, 40, 45, 64, 50, 89],
            type: 'line',
        }],
        chart: {
            height: 350,
            zoom: {
                enabled: false
            },
            dropShadow: {
                enabled: true,
                enabledOnSeries: undefined,
                top: 5,
                left: 0,
                blur: 3,
                color: '#000',
                opacity: 0.1
            },
        },
        dataLabels: {
            enabled: false
        },
        legend: {
            position: "top",
            horizontalAlign: "center",
            offsetX: -15,
            fontWeight: "bold",
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
        stroke: {
            curve: 'smooth',
            width: ['1.5', '1.5'],
            dashArray: [0, 5],
            colors: ["var(--primary-color)", "rgba(255, 90, 41, 1)"],
        },
        grid: {
            borderColor: '#f1f1f1',
            strokeDashArray: 3
        },
        colors: ["var(--primary-color)", "rgba(255, 90, 41, 1)"],
        yaxis: {
            title: {
                text: 'Statistics',
                style: {
                    color: '#adb5be',
                    fontSize: '14px',
                    fontFamily: 'poppins, sans-serif',
                    fontWeight: 600,
                    cssClass: 'apexcharts-yaxis-label',
                },
            },
        },
        xaxis: {
            type: 'month',
            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            axisBorder: {
                show: true,
                color: 'rgba(119, 119, 142, 0.05)',
                offsetX: 0,
                offsetY: 0,
            },
            axisTicks: {
                show: true,
                borderType: 'solid',
                color: 'rgba(119, 119, 142, 0.05)',
                width: 6,
                offsetX: 0,
                offsetY: 0
            },
            labels: {
                rotate: -90
            }
        }
    };
    var chart = new ApexCharts(document.querySelector("#statistics"), options);
    chart.render();
    /* Job Statistics */

}) ();