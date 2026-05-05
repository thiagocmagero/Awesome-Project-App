(function () {
    "use strict";

    /* Patients Analysis */
    var options = {
        series: [
            {
                name: "This Year",
                data: [20, 38, 38, 72, 55, 63, 43, 76, 55, 80, 40, 80],
                type: "area",
            },
            {
                name: "Previous Year",
                data: [85, 65, 75, 38, 85, 35, 62, 40, 40, 64, 50, 89],
                type: "line",
            },
        ],
        chart: {
            animations: {
                enabled: false,
            },
            height: 325,
            type: "line",
            zoom: {
                enabled: false,
            },
            toolbar: {
                show: false,
            },
        },
        dataLabels: {
            enabled: false,
        },
        legend: {
            show: true,
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
        stroke: {
            show: true,
            curve: "straight",
            width: [1.5, 1.5],
            dashArray: [0, 4],
        },
        grid: {
            borderColor: "rgba(107 ,114 ,128,0.1)",
        },
        plotOptions: {
            bar: {
                columnWidth: "45%",
                borderRadius: 2
            }
        },
        colors: ["var(--primary-color)", "var(--primary02)"],
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
        fill: {
            type: ['gradient', 'solid'],
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
                            opacity: 0.1
                        },
                        {
                            offset: 75,
                            color: "var(--primary01)",
                            opacity: 1
                        },
                        {
                            offset: 100,
                            color: 'var(--primary02)',
                            opacity: 1
                        }
                    ],
                    [
                        {
                            offset: 0,
                            color: 'var(--primary02)',
                            opacity: 1
                        },
                        {
                            offset: 75,
                            color: 'var(--primary02)',
                            opacity: 1
                        },
                        {
                            offset: 100,
                            color: 'var(--primary02)',
                            opacity: 1
                        }
                    ],
                ]
            }
        },
        yaxis: {
            title: {
                style: {
                    color: "#adb5be",
                    fontSize: "14px",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 600,
                    cssClass: "apexcharts-yaxis-label",
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
                style: {
                    colors: "rgb(107 ,114 ,128)",
                    fontSize: "12px",
                },
            },
        },
    };
    var chart = new ApexCharts(document.querySelector("#patients-analysis"), options);
    chart.render();
    /* Patients Analysis */

    /* Patients Overview */
    var options = {
        series: [
            {
                name: "Male",
                data: [80, 50, 30, 40, 100, 20, 80],
            },
            {
                name: "Female",
                data: [20, 100, 60, 50, 50, 80, 33],
            },
        ],
        chart: {
            height: 240,
            type: "radar",
            toolbar: {
                show: false,
            },
        },
        colors: ["rgba(255, 90, 41, 0.1)", "var(--primary01)"],
        stroke: {
            width: 1.5,
            colors: ["rgb(255, 90, 41)", "var(--primary-color)"],
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
            categories: ["Cardiology", "Pediatrics", "Orthopedic", "Neurology", "Psychiatry", "Radiology", "Others"],
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
    var chart = new ApexCharts(document.querySelector("#patients-overview"), options);
    chart.render();
    /* Patients Overview */

    /* Top Departments */
    var options = {
        series: [
            {
                data: [400, 430, 470, 540, 600, 800],
                name: "Patients",
            },
        ],
        chart: {
            type: "bar",
            height: 350,
            toolbar: {
                show: false,
            },
        },
        fill: {
            type: "solid",
        },
        plotOptions: {
            bar: {
                borderRadius: 4,
                horizontal: true,
                columnWidth: "20%",
                barHeight: "50%",
            },
        },
        colors: ["var(--primary-color)"],
        grid: {
            show: false,
            enabled: false,
            borderColor: "transparent",
        },
        dataLabels: {
            enabled: false,
        },
        xaxis: {
            categories: [
                "Dermatologists",
                "Cardiologist",
                "Gynecologist",
                "Dentist",
                "Neurosurgeon",
                "Orthopedic ",
            ],
            labels: {
                show: true,
                style: {
                    colors: "#adb5be",
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
                    colors: "#adb5be",
                    fontSize: "11px",
                    fontWeight: 600,
                    cssClass: "apexcharts-yaxis-label",
                },
            },
        },
    };
    var chart1 = new ApexCharts(document.querySelector("#top-departments"), options);
    chart1.render();
    /* Top Departments */

})();