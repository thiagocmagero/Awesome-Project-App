(function () {
    'use strict';

    /* Total Followers */
    var options = {
        series: [
            {
                data: [25, 66, 41, 89, 63, 25, 44],
            },
        ],
        chart: {
            type: "line",
            width: 80,
            height: 30,
            sparkline: {
                enabled: true,
            },
        },
        stroke: {
            curve: 'smooth',
            width: [1.5]
        },
        colors: ["var(--primary-color)"],
        xaxis: {
            crosshairs: {
                width: 1,
            },
        },
        tooltip: {
            fixed: {
                enabled: false,
            },
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
    };
    var chart = new ApexCharts(document.querySelector("#total-followers"), options);
    chart.render();
    /* Total Followers */

    /* Bounce Rate */
    var options1 = {
        series: [
            {
                data: [12, 14, 2, 47, 42, 15, 47],
            },
        ],
        chart: {
            type: "line",
            width: 80,
            height: 30,
            sparkline: {
                enabled: true,
            },
        },
        colors: ["rgb(255, 90, 41)"],
        stroke: {
            curve: 'smooth',
            width: [1.5]
        },
        xaxis: {
            crosshairs: {
                width: 1,
            },
        },
        tooltip: {
            fixed: {
                enabled: false,
            },
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
    };
    var chart1 = new ApexCharts(document.querySelector("#bounce-rate"), options1);
    chart1.render();
    /* Bounce Rate */

    /* Conversion Rate */
    var options2 = {
        series: [
            {
                data: [25, 66, 41, 89, 63, 25, 44],
            },
        ],
        chart: {
            type: "line",
            width: 80,
            height: 30,
            sparkline: {
                enabled: true,
            },
        },
        stroke: {
            curve: 'smooth',
            width: [1.5]
        },
        colors: ["rgb(12, 199, 99)"],
        xaxis: {
            crosshairs: {
                width: 1,
            },
        },
        tooltip: {
            fixed: {
                enabled: false,
            },
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
    };
    var chart2 = new ApexCharts(document.querySelector("#conversion-rate"), options2);
    chart2.render();
    /* Conversion Rate */

    /* Session Duration */
    var options3 = {
        series: [
            {
                data: [25, 66, 41, 89, 63, 25, 44],
            },
        ],
        chart: {
            type: "line",
            width: 70,
            height: 30,
            sparkline: {
                enabled: true,
            },
        },
        colors: ["rgb(12, 156, 252)"],
        xaxis: {
            crosshairs: {
                width: 1,
            },
        },
        stroke: {
            curve: 'smooth',
            width: [1.5]
        },
        tooltip: {
            fixed: {
                enabled: false,
            },
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
    };
    var chart3 = new ApexCharts(document.querySelector("#session-duration"), options3);
    chart3.render();
    /* Session Duration */

    /* Session Users */
    var options = {
        series: [{
            name: "Orders",
            type: "column",
            data: [33, 21, 32, 37, 23, 32, 47, 31, 54, 32, 20, 38]
        }, {
            name: "Sales",
            type: "area",
            data: [44, 55, 41, 42, 22, 43, 21, 35, 56, 27, 43, 27]
        }, {
            name: "Profit",
            type: "line",
            data: [30, 25, 36, 30, 45, 35, 64, 51, 59, 36, 39, 51]
        }],
        chart: {
            height: 333,
            type: "line",
            stacked: false,
            toolbar: {
                show: false
            }
        },
        stroke: {
            width: [0, 0, 1.5],
            dashArray: [0, 0, 5],
            show: true,
            curve: 'smooth',
            lineCap: 'butt',
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
        xaxis: {
            axisBorder: {
                color: 'rgba(119, 119, 142, 0.05)',
                offsetX: 0,
                offsetY: 0,
            },
            axisTicks: {
                color: 'rgba(119, 119, 142, 0.05)',
                width: 6,
                offsetX: 0,
                offsetY: 0
            },
        },
        plotOptions: {
            bar: {
                columnWidth: "30%",
                borderRadius: 3
            }
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
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        markers: {
            size: 0
        },
        colors: ["var(--primary-color)", "rgba(119, 119, 142, 0.05)", "rgb(255, 90, 41)"]
    };
    document.getElementById('session-users').innerHTML = '';
    var chart = new ApexCharts(document.querySelector("#session-users"), options);
    chart.render();
    /* Session Users */

    /* Visitors */
    var options = {
        series: [45, 55],
        chart: {
            height: 240,
            type: 'radialBar',
        },
        plotOptions: {
            radialBar: {
                offsetY: 0,
                startAngle: 0,
                endAngle: 360,
                hollow: {
                    margin: 5,
                    size: '65%',
                    background: 'transparent',
                    image: undefined,
                },
                dataLabels: {
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
                            return 219147
                        }
                    }
                }
            }
        },
        stroke: {
            lineCap: 'round'
        },
        grid: {
            padding: {
                bottom: -10,
                top: -10
            }
        },
        colors: ["var(--primary-color)", "rgba(255, 90, 41, 1)"],
        labels: ['Online Visitors', 'Offline Visitors'],
    };
    var chart = new ApexCharts(document.querySelector("#visitors"), options);
    chart.render();
    /* Visitors */

    /* Active Users */
    var options = {
        series: [
            {
                name: '2022',
                data: [23, 11, 22, 27, 13, 22, 37, 21, 44, 22, 45, 35]
            },
            {
                name: '2023',
                data: [44, 55, 41, 67, 22, 43, 21, 41, 56, 27, 43, 27]
            },
            {
                name: '2024',
                data: [30, 25, 36, 30, 45, 35, 64, 52, 59, 36, 39, 33]
            }
        ],
        chart: {
            toolbar: {
                show: false
            },
            type: 'area',
            height: 100,
            stacked: true,
            sparkline: {
                enabled: 'true',
            },
        },
        grid: {
            borderColor: '#f2f6f7',
        },
        colors: ["var(--primary08)", 'var(--primary04)', 'var(--primary02)'],
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        dataLabels: {
            enabled: false
        },
        stroke: {
            width: [0, 0, 0],
            curve: 'straight',
        },
        fill: {
            type: 'solid',
            gradient: {
                opacityFrom: 0.6,
                opacityTo: 0.8,
            }
        },
        legend: {
            show: false,
        },
    };
    var chart = new ApexCharts(document.querySelector("#audience-report"), options);
    chart.render();
    /* Active Users */

    /* Sessions Time */
    function generateData(count, yrange) {
        var i = 0;
        var series = [];
        while (i < count) {
            var x = (i + 1).toString();
            var y =
                Math.floor(Math.random() * (yrange.max - yrange.min + 1)) + yrange.min;

            series.push({
                x: x,
                y: y,
            });
            i++;
        }
        return series;
    }
    var options = {
        series: [
            {
                name: "1Am",
                data: generateData(7, {
                    min: 0,
                    max: 90,
                }),
            },
            {
                name: "4Am",
                data: generateData(7, {
                    min: 0,
                    max: 90,
                }),
            },
            {
                name: "8Am",
                data: generateData(7, {
                    min: 0,
                    max: 90,
                }),
            },
            {
                name: "12Am",
                data: generateData(7, {
                    min: 0,
                    max: 90,
                }),
            },
            {
                name: "3Pm",
                data: generateData(7, {
                    min: 0,
                    max: 90,
                }),
            },
            {
                name: "7Pm",
                data: generateData(7, {
                    min: 0,
                    max: 90,
                }),
            },
            {
                name: "12Pm",
                data: generateData(7, {
                    min: 0,
                    max: 90,
                }),
            },
        ],
        chart: {
            height: 262,
            type: "heatmap",
            toolbar: {
                show: false,
            },
        },
        dataLabels: {
            enabled: false,
        },
        colors: ["#735dff"],
        grid: {
            borderColor: "#f2f5f7",
        },
        xaxis: {
            categories: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            labels: {
                show: true,
                style: {
                    colors: "#8c9097",
                    fontSize: "11px",
                    fontWeight: 600,
                    cssClass: "apexcharts-xaxis-label",
                },
            },
        },
        yaxis: {
            labels: {
                show: true,
                style: {
                    colors: "#8c9097",
                    fontSize: "11px",
                    fontWeight: 600,
                    cssClass: "apexcharts-yaxis-label",
                },
            },
        },
    };
    var chart = new ApexCharts(document.querySelector("#sessions-time"), options);
    chart.render();
    /* Sessions Time */

    /* Sessions By Country */
    var options = {
        series: [{
            name: 'Sessions',
            data: [400, 430, 470, 540, 1100, 1200]
        }],
        chart: {
            toolbar: {
                show: false
            },
            type: 'bar',
            height: 280
        },
        grid: {
            borderColor: '#f2f6f7',
        },
        plotOptions: {
            bar: {
                borderRadius: 2,
                horizontal: true,
                barHeight: "40%",
                borderRadius: 3,
            }
        },
        colors: ["var(--primary-color)"],
        dataLabels: {
            enabled: false
        },
        xaxis: {
            categories: ['South Korea', 'Canada', 'United Kingdom', 'Netherlands', 'United States', 'China'],
        }
    };
    var chart = new ApexCharts(document.querySelector("#sessionsCountry"), options);
    chart.render();
    /* Sessions By Country */

})();