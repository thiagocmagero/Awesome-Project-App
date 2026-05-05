(function () {
    "use strict";

    /* Engaged Chart */
    var options = {
        series: [
            {
                data: [98, 110, 80, 145, 105, 112, 87, 148, 102],
            },
        ],
        chart: {
            height: 122,
            type: "area",
            fontFamily: "Roboto, Arial, sans-serif",
            foreColor: "#5d6162",
            zoom: {
                enabled: false,
            },
            sparkline: {
                enabled: true,
            },
            dropShadow: {
                enabled: true,
                enabledOnSeries: undefined,
                top: 7,
                left: 0,
                blur: 1,
                color: ["var(--primary-color)"],
                opacity: 0.05,
              },
        },
        tooltip: {
            enabled: true,
            x: {
                show: false,
            },
            y: {
                title: {
                    formatter: function (seriesName) {
                        return "";
                    },
                },
            },
            marker: {
                show: false,
            },
        },
        dataLabels: {
            enabled: false,
        },
        stroke: {
            curve: "straight",
        },
        title: {
            text: undefined,
        },
        grid: {
            borderColor: "transparent",
        },
        yaxis: {
         min: 0,
        },
        xaxis: {
            crosshairs: {
                show: false,
            },
        },
        colors: ["var(--primary-color)"],
        stroke: {
            width: [1.5],
        },
        fill: {
            type: "gradient",
            gradient: {
                opacityFrom: 0.5,
                opacityTo: 0.2,
                stops: [0, 60],
                colorStops: [
                    [
                        {
                            offset: 0,
                            color: "var(--primary01)",
                            opacity: 1
                          },
                          {
                            offset: 50,
                            color: "var(--primary01)",
                            opacity: 1
                          },
                          {
                            offset: 100,
                            color: 'var(--primary01)',
                            opacity: 0.5
                          }
                    ],
                ],
            },
        },
    };
    var chart1 = new ApexCharts(document.querySelector("#engaged"), options);
    chart1.render();
    /* Engaged Chart */

    /* Impressions Chart */
    var options = {
        series: [
            {
                data: [102, 148, 87, 112, 105, 145, 80, 110, 98],
            },
        ],
        chart: {
            height: 122,
            type: "area",
            fontFamily: "Roboto, Arial, sans-serif",
            foreColor: "#5d6162",
            zoom: {
                enabled: false,
            },
            sparkline: {
                enabled: true,
            },
            dropShadow: {
                enabled: true,
                enabledOnSeries: undefined,
                top: 7,
                left: 0,
                blur: 1,
                color: ["rgb(255, 90, 41)"],
                opacity: 0.05,
              },
        },
        tooltip: {
            enabled: true,
            x: {
                show: false,
            },
            y: {
                title: {
                    formatter: function (seriesName) {
                        return "";
                    },
                },
            },
            marker: {
                show: false,
            },
        },
        dataLabels: {
            enabled: false,
        },
        stroke: {
            curve: "straight",
        },
        title: {
            text: undefined,
        },
        grid: {
            borderColor: "transparent",
        }, 
         yaxis: {
            min: 0,
           },
        xaxis: {
            crosshairs: {
                show: false,
            },
        },
        colors: ["rgb(255, 90, 41)"],
        stroke: {
            width: [1.5],
        },
        fill: {
            type: "gradient",
            gradient: {
                opacityFrom: 0.5,
                opacityTo: 0.2,
                stops: [0, 60],
                colorStops: [
                    [
                        {
                            offset: 0,
                            color: "rgba(255, 90, 41,0.1)",
                            opacity: 1
                          },
                          {
                            offset: 75,
                            color: "rgba(255, 90, 41,0.1)",
                            opacity: 1
                          },
                          {
                            offset: 100,
                            color: 'rgba(255, 90, 41,0.1)',
                            opacity: 0.5
                          }
                    ],
                ],
            },
        },
    };
    var chart = new ApexCharts(document.querySelector("#impressions"), options);
    chart.render();
    /* Impressions Chart */

    /* Audience Report */
    var options = {
        series: [
            {
                name: "Followers",
                data: [20, 38, 38, 72, 55, 63, 43, 76, 55, 80, 40, 80],
                type: "column",
            }
        ],
        chart: {
            height: 275,
            type: "line",
            toolbar: {
                show: false,
            },
            zoom: {
                enabled: false,
            },
        },
        plotOptions: {
            bar: {
                columnWidth: "35%",
                borderRadiusApplication: "end",
                borderRadiusWhenStacked: "all",
                borderRadius: 5,
                colors: {
                    ranges: [{
                        from: 0,
                        to: 45,
                        color: 'var(--primary-color)'
                    }, {
                        from: 45,
                        to: 65,
                        color: 'var(--primary03)'
                    }, {
                        from: 65,
                        to: 100,
                        color: 'var(--primary01)'
                    }]
                },
            }
        },
        dataLabels: {
            enabled: false,
        },
        legend: {
            position: "top",
            horizontalAlign: "center",
        },
        stroke: {
            curve: "smooth",
            width: ["0"],
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
        colors: ["var(--primary-color)"],
        xaxis: {
            type: "month",
            categories: [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
            ],
            axisBorder: {
                show: true,
                color: "rgba(119, 119, 142, 0.05)",
                offsetX: 0,
                offsetY: 0,
            },
            axisTicks: {
                show: true,
                borderType: "solid",
                color: "rgba(119, 119, 142, 0.05)",
                width: 6,
                offsetX: 0,
                offsetY: 0,
            },
            labels: {
                rotate: -90,
            },
        },
    };
    var chart = new ApexCharts(document.querySelector("#audience-report"), options);
    chart.render();
    /* Audience Report */

    /* Audience Reached Charts */
    var options = {
        series: [1200, 750],
        labels: ["Female", "Male"],
        chart: {
            height: 275,
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
                            label: 'Audience Reached',
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
    var chart = new ApexCharts(document.querySelector("#audience-reached"), options);
    chart.render();
    /* Audience Reached Charts */

})()