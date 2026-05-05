(function () {
  "use strict";

  /* Order Statistics */
  var options = {
    series: [
      {
        name: "Delivered",
        data: [56, 58, 38, 50, 64, 45, 55, 32, 15, 63, 51, 86],
        type: "area",
      },
      {
        name: "Pending",
        data: [48, 29, 50, 69, 20, 59, 52, 12, 48, 28, 17, 98],
        type: "line",
      }, {
        name: 'Cancelled',
        data: [32, 15, 63, 51, 36, 62, 99, 42, 78, 76, 32, 120]
      }
    ],
    chart: {
      type: "line",
      height: 337,
      toolbar: {
        show: false
      },
      dropShadow: {
        enabled: true,
        enabledOnSeries: undefined,
        top: 7,
        left: 0,
        blur: 1,
        color: ["var(--primary-color)", "var(--primary02)", "rgb(255, 90, 41)"],
        opacity: 0.05,
      },
    },
    colors: [
      "var(--primary-color)",
      "var(--primary02)", "rgb(255, 90, 41)"
    ],
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: true,
      position: "top",
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
      width: [1.5, 1.5, 1.5],
      lineCap: 'round',
      dashArray: [0, 4, 0],
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
              color: 'rgb(255, 90, 41)',
              opacity: 1
            },
            {
              offset: 75,
              color: 'rgb(255, 90, 41)',
              opacity: 1
            },
            {
              offset: 100,
              color: 'rgb(255, 90, 41)',
              opacity: 1
            }
          ],
        ]
      }
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
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      show: false,
      axisBorder: {
        show: false,
        color: 'rgba(119, 119, 142, 0.05)',
        offsetX: 0,
        offsetY: 0,
      },
      axisTicks: {
        show: false,
        borderType: 'solid',
        color: 'rgba(119, 119, 142, 0.05)',
        width: 6,
        offsetX: 0,
        offsetY: 0
      },
      labels: {
        rotate: -90,
      }
    },
  };
  var chart4 = new ApexCharts(document.querySelector("#ordered-statistics"), options);
  chart4.render();
  /* Order Statistics */

  /* Top Categories */
  var options = {
    series: [1754, 1234, 878, 270, 456],
    labels: ["Electrnoics", "Accesories", "Home Appliances", "Beauty Products", "Furniture"],
    chart: {
      height: 235,
      type: 'donut',
    },
    dataLabels: {
      enabled: false,
      dropShadow: {
        enabled: false,
      }
    },
    legend: {
      show: false,
    },
    plotOptions: {
      pie: {
        expandOnClick: false,
        donut: {
          size: '80%',
          background: 'transparent',
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
        }
      }
    },
    colors: ["var(--primary-color)", "rgba(255, 90, 41, 1)", "rgba(12, 199, 99, 1)", "rgba(12, 156, 252, 1)", 'rgba(255, 154, 19, 1)'],
  };
  var chart1 = new ApexCharts(document.querySelector("#top-categories"), options);
  chart1.render();
  /* Top Categories */

  /* Visitors Report */
  var options = {
    series: [
      {
        name: "This Week",
        data: [25, 50, 30, 55, 20, 45, 30],
        type: 'column',
      },
      {
        name: "Last Week",
        data: [35, 25, 40, 30, 45, 35, 60],
        type: 'line',
      }
    ],
    chart: {
      height: 245,
      type: 'line',
      toolbar: {
        show: false
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
    plotOptions: {
      bar: {
        columnWidth: '35%',
        borderRadius: [2],
      }
    },
    colors: ['var(--primary-color)', 'rgb(255, 90, 41)'],
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: 'smooth',
      width: 2,
      dashArray: [0, 3],
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
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      show: false,
      axisBorder: {
        show: false,
        color: 'rgba(119, 119, 142, 0.05)',
        offsetX: 0,
        offsetY: 0,
      },
      axisTicks: {
        show: false,
        borderType: 'solid',
        color: 'rgba(119, 119, 142, 0.05)',
        width: 6,
        offsetX: 0,
        offsetY: 0
      },
      labels: {
        rotate: -90,
      }
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
        radius: 5,
        customHTML: undefined,
        onClick: undefined,
        offsetX: 0,
        offsetY: 0
      },
    },
  };
  var chart = new ApexCharts(document.querySelector("#visitors-report"), options);
  chart.render();
  /* Visitors Report */

  /* Segmentation */
  var options = {
    series: [18235, 12743, 5369, 16458],
    labels: ["male", "Female", "Others", "Not Mentioned"],
    chart: {
      height: 194,
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
      width: 0,
      dashArray: 0,
    },
    stroke: {
      width: 2,
    },
    plotOptions: {
      pie: {
        startAngle: -90,
        endAngle: 90,
        offsetY: 10,
        expandOnClick: false,
        donut: {
          size: '80%',
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
        bottom: -85
      }
    },
    colors: ["var(--primary-color)", "rgba(255, 90, 41, 1)", "rgba(12, 199, 99, 1)", "rgba(12, 156, 252, 1)"],
  };
  var chart = new ApexCharts(document.querySelector("#segmentation"), options);
  chart.render();
  /* Segmentation */

})();