(function () {
  "use strict";

  /* Revenue Statistics */
  var options = {
    chart: {
      height: 325,
      toolbar: {
        show: false,
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
    grid: {
      show: true,
      borderColor: "rgba(119, 119, 142, 0.1)",
      strokeDashArray: 4,
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      width: [1.5, 1.5],
      curve: "smooth",
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "center",
      fontWeight: 600,
      fontSize: "11px",
      labels: {
        colors: "#74767c",
      },
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
    series: [
      {
        name: "Students",
        data: [65, 20, 40, 55, 80, 90, 59, 86, 120, 165, 115, 120],
        type: "area",
      },
      {
        name: "Earnings",
        data: [20, 65, 85, 38, 55, 25, 25, 165, 75, 64, 70, 75],
        type: "line",
      },
    ],
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
    colors: ["var(--primary-color)", "rgba(255, 90, 41)"],
    yaxis: {
      min:0,
      title: {
        style: {
          color: "#adb5be",
          fontSize: "14px",
          fontFamily: "poppins, sans-serif",
          fontWeight: 600,
          cssClass: "apexcharts-yaxis-label",
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
  var chart = new ApexCharts(document.querySelector("#revenue-statistics"), options);
  chart.render();
  /* Revenue Statistics */

  /* course statistics */
  var options = {
    series: [{
      name: 'Finished',
      data: [44, 42, 57, 86, 58, 55, 70],
    }, {
      name: 'Pending',
      data: [34, 22, 47, 56, 21, 35, 60],
    }
    ],
    chart: {
      type: 'bar',
      height: 348,
    },
    grid: {
      show: true,
      borderColor: 'rgba(119, 119, 142, 0.1)',
      strokeDashArray: 4,
    },
    colors: ["var(--primary08)", "rgba(255, 90, 41, 0.8)"],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '45%',
        borderRadius: 1,
      },
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    states: {
      hover: {
        filter: {
          type: 'none'
        }
      }
    }, 
    yaxis: {
      title: {
        style: {
          color: '	#adb5be',
          fontSize: '14px',
          fontFamily: 'poppins, sans-serif',
          fontWeight: 600,
          cssClass: 'apexcharts-yaxis-label',
        },
      },
      labels: {
        formatter: function (y) {
          return y.toFixed(0) + "";
        }
      }
    },
    xaxis: {
      categories: ['Mon', 'Tue', 'Web', 'Thu', 'Fri', 'Sat', 'Sun'],
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
    },
    fill: {
      opacity: 1
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
  };
  var chart1 = new ApexCharts(document.querySelector("#course-statistics"), options);
  chart1.render();
  /* course statistics */

})();