(function () {
    "use strict";

    /* Sales Report */
    var options = {
        chart: {
            type: "line",
            height: 280,
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
                data: [65, 20, 40, 55, 80, 90, 59, 86, 120, 165, 115, 120],
                type: "bar",
            },
            {
                name: "Sales",
                data: [20, 65, 85, 38, 55, 25, 25, 165, 75, 64, 70, 75],
                type: "line",
            },
        ],
        plotOptions: {
            bar: {
                horizontal: false,
                borderRadius: 2,
                borderRadiusApplication: "all",
                borderRadiusWhenStacked: "last",
                columnWidth: "30%",
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
            },
            labels: {
                formatter: function (y) {
                    return y.toFixed(0) + "";
                },
                show: true,
                style: {
                    colors: "#8c9097",
                    fontSize: "11px",
                    fontWeight: 600,
                    cssClass: "apexcharts-xaxis-label",
                },
            },
        },
        xaxis: {
            type: "day",
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
    /* Sales Report */

    /* Orders Summary */
    var options = {
        series: [1754, 634, 878, 470],
        labels: ["Delivered", "Cancelled", "Pending", "Returned"],
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
                      label: 'Total Visitors',
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

})();