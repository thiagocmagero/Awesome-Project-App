(function () {
    'use strict';

    var options = {
        chart: {
            type: "line",
            height: 375,
            toolbar: {
                show: false,
            },
            dropShadow: {
                enabled: true,
                enabledOnSeries: undefined,
                top: 7,
                left: 0,
                blur: 1,
                color: ["transparent", "rgb(255, 90, 41)"],
                opacity: 0.05,
            },
        },
        grid: {
            show: true,
            borderColor: "rgba(119, 119, 142, 0.1)",
            strokeDashArray: 4,
        },
        dataLabels: {
            enabled: false,
        },
        stroke: {
            width: [2, 2],
            curve: "smooth",
        },
        legend: {
            show: true,
            position: "bottom",
            horizontalAlign: "center",
            fontWeight: 600,
            fontSize: "11px",
            offsetY: 10,
            tooltipHoverFormatter: function (val, opts) {
                return (
                    val +
                    " - " +
                    opts.w.globals.series[opts.seriesIndex][opts.dataPointIndex] +
                    ""
                );
            },
            labels: {
                colors: "#74767c",
            },
            markers: {
                size: 4,
                strokeWidth: 0,
                radius: 12,
                offsetX: 0,
                offsetY: 0,
            },
        },
        series: [
            {
                name: "Orders",
                data: [14, 12, 17, 16, 18, 15, 18, 23, 28, 44, 40, 34, 34, 22, 37, 46, 21, 35, 40, 34, 46, 55, 62, 55, 23, 20, 22, 33, 35, 23],
                type: "bar",
            },
            {
                name: "Sales",
                data: [35, 36, 22, 44, 48, 37, 36, 26, 27, 33, 32, 36, 55, 53, 46, 40, 45, 38, 46, 37, 22, 34, 40, 44, 28, 33, 34, 36, 40, 36],
                type: "line",
            },
        ],
        plotOptions: {
            bar: {
                horizontal: false,
                borderRadius: 2,
                borderRadiusApplication: "all",
                borderRadiusWhenStacked: "last",
                columnWidth: "55%",
            },
        },
        colors: ["var(--primary-color)", "rgb(255, 90, 41)"],
        yaxis: {
            title: {
                style: {
                    color: "#adb5be",
                    fontSize: "14px",
                    fontFamily: "poppins, sans-serif",
                    fontWeight: 600,
                    cssClass: "apexcharts-yaxis-label",
                },
            }
        },
        xaxis: {
            type: "day",
            categories: [
                "10",
                "20",
                "30",
                "40",
                "50",
                "60",
                "70",
                "80",
                "90",
                "100",
                "110",
                "120",
                "130",
                "140",
                "150",
                "160",
                "170",
                "180",
                "190",
                "200",
                "210",
                "220",
                "230",
                "240",
                "250",
                "260",
                "270",
                "280",
                "290",
                "300",
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
                    colors: "#8c9097",
                    fontSize: "11px",
                    fontWeight: 600,
                    cssClass: "apexcharts-xaxis-label",
                },
            },
        },
    };
    var chart = new ApexCharts(document.querySelector("#revenue-overview"), options);
    chart.render();

  

    /* Total Sales */
    var spark1 = {
        chart: {
            type: 'line',
            height: 30,
            sparkline: {
                enabled: true
            },
            dropShadow: {
                enabled: true,
                enabledOnSeries: undefined,
                top: 3,
                bottom: -50,
                left: 0,
                blur: 3,
                color: 'var(--primary-color)',
                opacity: 0.1
            }
        },
        grid: {
            show: false,
            xaxis: {
                lines: {
                    show: false
                }
            },
            yaxis: {
                lines: {
                    show: false
                }
            },
        },
        stroke: {
            show: true,
            curve: 'smooth',
            lineCap: 'butt',
            colors: undefined,
            width: 1.8,
            dashArray: 0,
        },
        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                type: "horizontal",
                colorStops: [
                    [
                        {
                            offset: 0,
                            color: "var(--primary-color)",
                            opacity: 0.8
                        },
                        {
                            offset: 90,
                            color: "var(--primary-color)",
                            opacity: 0.8
                        }
                    ]
                ]
            }
        },
        series: [{
            name: 'Value',
            data: [47, 45, 54, 38, 56, 24, 65, 31, 37, 39, 62, 51, 35, 41, 35, 27, 93, 53, 61, 27, 54, 43, 19, 46]
        }],
        yaxis: {
            min: 0,
            show: false
        },
        xaxis: {
            show: false,
            axisTicks: {
                show: false
            },
            axisBorder: {
                show: false
            }
        },
        yaxis: {
            axisBorder: {
                show: false
            },
        },
        colors: ['var(--primary-color)'],
    }
    var spark1 = new ApexCharts(document.querySelector("#totalsales"), spark1);
    spark1.render();
    /* Total Sales */

      /* Total revenue */
      var spark2 = {
        chart: {
            type: 'line',
            height: 30,
            sparkline: {
                enabled: true
            },
            dropShadow: {
                enabled: true,
                enabledOnSeries: undefined,
                top: 3,
                bottom: -50,
                left: 0,
                blur: 3,
                color: 'rgba(255, 90, 41)',
                opacity: 0.1
            }
        },
        grid: {
            show: false,
            xaxis: {
                lines: {
                    show: false
                }
            },
            yaxis: {
                lines: {
                    show: false
                }
            },
        },
        stroke: {
            show: true,
            curve: 'smooth',
            lineCap: 'butt',
            colors: undefined,
            width: 1.8,
            dashArray: 0,
        },
        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                type: "horizontal",
                colorStops: [
                    [
                        {
                            offset: 0,
                            color: "rgba(255, 90, 41)",
                            opacity: 0.8
                        },
                        {
                            offset: 90,
                            color: "rgba(255, 90, 41)",
                            opacity: 0.8
                        }
                    ]
                ]
            }
        },
        series: [{
            name: 'Value',
            data: [47, 45, 54, 38, 56, 24, 65, 31, 37, 39, 62, 51, 35, 41, 35, 27, 93, 53, 61, 27, 54, 43, 19, 46]
        }],
        yaxis: {
            min: 0,
            show: false
        },
        xaxis: {
            show: false,
            axisTicks: {
                show: false
            },
            axisBorder: {
                show: false
            }
        },
        yaxis: {
            axisBorder: {
                show: false
            },
        },
        colors: ['rgb(255, 90, 41)'],
    }
    var spark2 = new ApexCharts(document.querySelector("#totalrevenue"), spark2);
    spark2.render();
    /* Total revenue */

       /* Total customers */
       var spark3 = {
        chart: {
            type: 'line',
            height: 30,
            sparkline: {
                enabled: true
            },
            dropShadow: {
                enabled: true,
                enabledOnSeries: undefined,
                top: 3,
                bottom: -50,
                left: 0,
                blur: 3,
                color: 'rgba(12, 199, 99)',
                opacity: 0.1
            }
        },
        grid: {
            show: false,
            xaxis: {
                lines: {
                    show: false
                }
            },
            yaxis: {
                lines: {
                    show: false
                }
            },
        },
        stroke: {
            show: true,
            curve: 'smooth',
            lineCap: 'butt',
            colors: undefined,
            width: 1.8,
            dashArray: 0,
        },
        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                type: "horizontal",
                colorStops: [
                    [
                        {
                            offset: 0,
                            color: "rgba(12, 199, 99)",
                            opacity: 0.8
                        },
                        {
                            offset: 90,
                            color: "rgba(12, 199, 99)",
                            opacity: 0.8
                        }
                    ]
                ]
            }
        },
        series: [{
            name: 'Value',
            data: [47, 45, 54, 38, 56, 24, 65, 31, 37, 39, 62, 51, 35, 41, 35, 27, 93, 53, 61, 27, 54, 43, 19, 46]
        }],
        yaxis: {
            min: 0,
            show: false
        },
        xaxis: {
            show: false,
            axisTicks: {
                show: false
            },
            axisBorder: {
                show: false
            }
        },
        yaxis: {
            axisBorder: {
                show: false
            },
        },
        colors: ['rgb(12, 199, 99)'],
    }
    var spark3 = new ApexCharts(document.querySelector("#totalcustomers"), spark3);
    spark3.render();
    /* Total customers */

     /* Orders Summary */
     var options = {
        series: [18235, 12743,5369, 16458],
        labels: ["Today", "This Week", "This Month", "This Year"],
        chart: {
            height: 190,
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
                startAngle: -90,
                endAngle: 90,
                offsetY: 10,
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
                      offsetY: -35
                    },
                    value: {
                      show: true,
                      fontSize: '22px',
                      color: undefined,
                      offsetY: -25,
                      fontWeight: 600,
                      fontFamily: "Montserrat, sans-serif",
                      formatter: function (val) {
                        return val + "%"
                      }
                    },
                    total: {
                      show: true,
                      showAlways: true,
                      label: 'Total Revenue',
                      fontSize: '14px',
                      fontWeight: 400,
                      color: '#495057',
                    }
                  }
                }
            }
        },
        grid: {
          padding: {
            bottom: -100
          }
        },
        colors: ["var(--primary-color)", "rgb(255, 90, 41)", "rgb(12, 199, 99)", "rgb(12, 156, 252)"],
    };
    var chart = new ApexCharts(document.querySelector("#orders-summary"), options);
    chart.render();
    /* Orders Summary */
  
     /* Revenue Analytics Chart */
     var options = {
        series: [{
            name: "Sales",
            data: [30, 38, 25, 42, 35, 13, 63,25,53],
            type: 'area',
        },
        {
            name: "Revenue",
            data: [20, 38, 38, 72, 55, 63, 43,55,33],
            type: 'line',
        }],
        chart: {
            height: 265,
            zoom: {
                enabled: false
            },
            toolbar: { show: false }
        },
        dataLabels: {
            enabled: false
        },
        legend: {
            show: true,
            position: "bottom",
            offsetX: 0,
            offsetY: 8,
            markers: {
                size: 4,
                strokeWidth: 0,
                strokeColor: '#fff',
                fillColors: undefined,
                radius: 12,
                customHTML: undefined,
                onClick: undefined,
                offsetX: 0,
                offsetY: 0
            },
        },
        stroke: {
            curve: 'smooth',
            width: [2,2],
            dashArray:[0,4]
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                type:'vertical',
                opacityTo: 0.1,
                stops: [0, 90, 100],
                colorStops: [
                    [
                        {
                            offset: 0,
                            color: "var(--primary-color)",
                            opacity: 0.1
                        },
                        {
                            offset: 50,
                            color: "var(--primary-color)",
                            opacity: 0.1
                        },
                        {
                            offset: 100,
                            color: "var(--primary02)",
                            opacity: 0.1
                        }
                    ],
                    [
                        {
                            offset: 0,
                            color: "rgba(255, 90, 41)",
                            opacity: 1
                        },
                        {
                            offset: 75,
                            color: "rgba(255, 90, 41)",
                            opacity: 1
                        },
                        {
                            offset: 100,
                            color: "rgba(255, 90, 41)",
                            opacity: 1
                        }
                    ],
                   
                ]
            }
        },
        grid: {
            borderColor: '#f5f4f4',
            strokeDashArray: 3
        },
        colors: ["var(--primary-color)","rgba(255, 90, 41)"],
        yaxis: {
            min:0,
        },
        xaxis: {
            type: 'week',
            categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun','sun'],
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
    var chart = new ApexCharts(document.querySelector("#crm-revenue-analytics"), options);
    chart.render();
    
/* Revenue Analytics Chart */

})();