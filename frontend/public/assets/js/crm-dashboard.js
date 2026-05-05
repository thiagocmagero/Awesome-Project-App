(function () {
    "use strict";

    var randomizeArray = function (arg) {
        var array = arg.slice();
        var currentIndex = array.length, temporaryValue, randomIndex;

        while (0 !== currentIndex) {

            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }
    // data for the main cards sparklines
    var sparklineData = [47, 45, 54, 38, 56, 24, 65, 31, 37, 39, 62, 51, 35, 41, 35, 27, 93, 53, 61, 27, 54, 43, 19, 46];


    /* Total Customers */
    var options1 = {
        series: [{
            data: randomizeArray(sparklineData)
        }],
        labels: [...Array(24).keys()].map(n => `2018-09-0${n + 1}`),
        chart: {
            type: 'area',
            height: 50,
            sparkline: {
                enabled: true
            },
        },
        stroke: {
            curve: 'smooth',
            width: 1.5,
        },
        colors: ["var(--primary-color)"],
        fill: {
            type: ['gradient'],
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.1,
                stops: [0, 90, 100],
                colorStops: [
                    [
                        {
                            offset: 0,
                            color: "var(--primary01)",
                            opacity: 1
                        },
                        {
                            offset: 75,
                            color: "var(--primary005)",
                            opacity: 1
                        },
                        {
                            offset: 100,
                            color: 'var(--primary005)',
                            opacity: 0.05
                        }
                    ],
                ]
            }
        },
        tooltip: {
            fixed: {
                enabled: false
            },
            x: {
                show: false
            },
            y: {
                title: {
                    formatter: function (seriesName) {
                        return ''
                    }
                }
            },
            marker: {
                show: false
            }
        }
    };
    var chart1 = new ApexCharts(document.querySelector("#total-customers"), options1);
    chart1.render();
    /* Total Customers */

    /* Total Revenue */
    var options1 = {
        series: [{
            data: randomizeArray(sparklineData)
        }],
        labels: [...Array(24).keys()].map(n => `2018-09-0${n + 1}`),
        chart: {
            type: 'area',
            height: 50,
            sparkline: {
                enabled: true
            },
        },
        stroke: {
            curve: 'smooth',
            width: 1.5,
        },
        colors: ["rgb(255, 90, 41)"],
        fill: {
            type: ['gradient'],
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.1,
                stops: [0, 90, 100],
                colorStops: [
                    [
                        {
                            offset: 0,
                            color: "rgba(255, 90, 41, 0.1)",
                            opacity: 1
                        },
                        {
                            offset: 75,
                            color: "rgba(255, 90, 41, 0.05)",
                            opacity: 1
                        },
                        {
                            offset: 100,
                            color: 'rgba(255, 90, 41, 0.05)',
                            opacity: 0.05
                        }
                    ],
                ]
            }
        },
        tooltip: {
            fixed: {
                enabled: false
            },
            x: {
                show: false
            },
            y: {
                title: {
                    formatter: function (seriesName) {
                        return ''
                    }
                }
            },
            marker: {
                show: false
            }
        }
    };
    var chart1 = new ApexCharts(document.querySelector("#total-revenue"), options1);
    chart1.render();
    /* Total Revenue */

    /* Conversioon Ratio */
    var options1 = {
        series: [{
            data: randomizeArray(sparklineData)
        }],
        labels: [...Array(24).keys()].map(n => `2018-09-0${n + 1}`),
        chart: {
            type: 'area',
            height: 50,
            sparkline: {
                enabled: true
            },
        },
        stroke: {
            curve: 'smooth',
            width: 1.5,
        },
        colors: ["rgb(12, 199, 99)"],
        fill: {
            type: ['gradient'],
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.1,
                stops: [0, 90, 100],
                colorStops: [
                    [
                        {
                            offset: 0,
                            color: "rgba(12, 199, 99, 0.1)",
                            opacity: 1
                        },
                        {
                            offset: 75,
                            color: "rgba(12, 199, 99, 0.05)",
                            opacity: 1
                        },
                        {
                            offset: 100,
                            color: 'rgba(12, 199, 99, 0.05)',
                            opacity: 0.05
                        }
                    ],
                ]
            }
        },
        tooltip: {
            fixed: {
                enabled: false
            },
            x: {
                show: false
            },
            y: {
                title: {
                    formatter: function (seriesName) {
                        return ''
                    }
                }
            },
            marker: {
                show: false
            }
        }
    };
    var chart1 = new ApexCharts(document.querySelector("#conversion-ratio"), options1);
    chart1.render();
    /* Conversion Ratio */

    /* Total Deals */
    var options1 = {
        series: [{
            data: randomizeArray(sparklineData)
        }],
        labels: [...Array(24).keys()].map(n => `2018-09-0${n + 1}`),
        chart: {
            type: 'area',
            height: 50,
            sparkline: {
                enabled: true
            },
        },
        stroke: {
            curve: 'smooth',
            width: 1.5,
        },
        colors: ["rgb(12, 156, 252)"],
        fill: {
            type: ['gradient'],
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.1,
                stops: [0, 90, 100],
                colorStops: [
                    [
                        {
                            offset: 0,
                            color: "rgba(12, 156, 252, 0.1)",
                            opacity: 1
                        },
                        {
                            offset: 75,
                            color: "rgba(12, 156, 252, 0.05)",
                            opacity: 1
                        },
                        {
                            offset: 100,
                            color: 'rgba(12, 156, 252, 0.05)',
                            opacity: 0.05
                        }
                    ],
                ]
            }
        },
        tooltip: {
            fixed: {
                enabled: false
            },
            x: {
                show: false
            },
            y: {
                title: {
                    formatter: function (seriesName) {
                        return ''
                    }
                }
            },
            marker: {
                show: false
            }
        }
    };
    var chart1 = new ApexCharts(document.querySelector("#total-deals"), options1);
    chart1.render();
    /* Total Deals */

    /* Leads-overview */
    var options = {
        series: [
            {
                name: "Hot Leads",
                data: [80, 50, 30, 40, 100, 20],
            },
            {
                name: "Warm Leads",
                data: [20, 30, 40, 80, 20, 80],
            },
            {
                name: "Cold Leads",
                data: [15, 60, 50, 20, 30, 40],
            },
            {
                name: "Lost Leads",
                data: [44, 76, 78, 13, 43, 10],
            },
        ],
        chart: {
            height: 220,
            type: "radar",
            toolbar: {
                show: false,
            },
        },
        colors: ["var(--primary02)", "rgba(255, 90, 41, 0.2)", "rgba(12, 199, 99, 0.2)", "rgba(12, 156, 252, 0.2)"],
        stroke: {
            width: 1.5,
            colors: ["var(--primary-color)", "rgb(255, 90, 41)", "rgb(12, 199, 99)", "rgb(12, 156, 252)"],
        },
        fill: {
            opacity: 0.1,
        },
        markers: {
            size: 0,
        },
        legend: {
            show: false,
            offsetX: 0,
            offsetY: 0,
            fontSize: "12px",
            markers: {
                width: 6,
                height: 6,
                strokeWidth: 0,
                strokeColor: "#fff",
                fillColors: undefined,
                radius: 5,
                customHTML: undefined,
                onClick: undefined,
                offsetX: 0,
                offsetY: 0,
            },
        },
        xaxis: {
            categories: ["2019", "2020", "2021", "2022", "2023", "2024"],
            axisBorder: { show: false },
        },
        yaxis: {
            axisBorder: { show: false },
        },
        grid: {
            padding: {
                bottom: -25
            }
        },
    };
    var chart = new ApexCharts(document.querySelector("#leads-overview"), options);
    chart.render();
    /* Leads-overview */

    /*  Project Analysis chart */
    var options = {
        series: [
            {
                name: "Total Income",
                data: [45, 30, 49, 45, 36, 42, 30, 35, 35, 54, 29, 36],
            },
            {
                name: "Total Expenses",
                data: [30, 35, 35, 30, 45, 25, 36, 54, 36, 29, 49, 42],
            },
            {
                name: "Total Deals",
                data: [45, 30, 49, 30, 45, 25, 36, 54, 36, 29, 49, 42],
            },
        ],
        chart: {
            type: "bar",
            height: 293,
            toolbar: {
                show: false,
            },
            dropShadow: {
                enabled: false,
            },
            stacked: true,
        },
        plotOptions: {
            bar: {
                columnWidth: "30%",
                borderRadiusApplication: "around",
                borderRadiusWhenStacked: "all",
                borderRadius: 3,
            },
        },
        responsive: [
            {
                breakpoint: 500,
                options: {
                    plotOptions: {
                        bar: {
                            columnWidth: "60%",
                        },
                    },
                },
            },
        ],
        stroke: {
            show: true,
            curve: "smooth",
            lineCap: "butt",
            width: [5, 5, 5],
            dashArray: 0,
        },
        grid: {
            borderColor: "#f5f4f4",
            strokeDashArray: 5,
            yaxis: {
                lines: {
                    show: true, 
                },
            },
        },
        colors: ["var(--primary-color)", "rgb(255, 90, 41)", "rgb(12, 199, 99)"],
        dataLabels: {
            enabled: false,
        },
        legend: {
            position: "top",
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
            title: {
                style: {
                    color: "#adb5be",
                    fontSize: "14px",
                    fontFamily: "Montserrat, sans-serif",
                    fontWeight: 600,
                    cssClass: "apexcharts-yaxis-label",
                },
            },
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
                formatter: function (y) {
                    return y.toFixed(0) + "";
                },
            },
        },
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
                "sep",
                "oct",
                "nov",
                "dec",
            ],
            axisBorder: {
                show: false,
                color: "rgba(119, 119, 142, 0.05)",
                offsetX: 0,
                offsetY: 0,
            },
            axisTicks: {
                show: false,
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
    var chart = new ApexCharts(document.querySelector("#project-analysis"), options);
    chart.render();
    /*  Project Analysis chart */

    /*  Leads By Channel */
    var options = {
        series: [76, 67, 61, 40],
        chart: {
            height: 220,
            type: "donut",
        },
        dataLabels: {
            enabled: false,
            color: "#fff",
        },
        dataLabels: {
            enabled: false,
        },
        legend: {
            show: false,
        },
        stroke: {
            show: true,
            curve: "smooth",
            lineCap: "round",
            colors: "#fff",
            width: 2,
            dashArray: 0,
        },
        fill: {
            type: "solid",
        },
        plotOptions: {
            pie: {
                expandOnClick: false,
                donut: {
                    size: "80%",
                    background: "transparent",
                    labels: {
                      show: true,
                      name: {
                        show: true,
                        fontSize: '20px',
                        color: '#495057',
                        fontFamily: "Montserrat, sans-serif",
                        offsetY: -5
                      },
                      value: {
                        show: true,
                        fontSize: '22px',
                        color: undefined,
                        offsetY: 5,
                        fontWeight: 600,
                        fontFamily: "Montserrat, sans-serif",
                        formatter: function (val) {
                          return val + "%"
                        }
                      },
                      total: {
                        show: true,
                        showAlways: true,
                        label: 'Total Sales',
                        fontSize: '14px',
                        fontWeight: 400,
                        color: '#495057',
                      }
                    }
                },
            },
        },
        colors: [
            "var(--primary-color)",
            "rgb(255, 90, 41)",
            "rgb(12, 199, 99)",
            "rgb(12, 156, 252)",
        ],
        labels: ["Direct", "Referral", "Social", "Organic Search"],
        responsive: [
            {
                breakpoint: 480,
                options: {
                    legend: {
                        show: false,
                    },
                },
            },
        ],
    };
    var chart = new ApexCharts(document.querySelector("#leads-channels"), options);
    chart.render();
    /* Leads By Channel */

})();