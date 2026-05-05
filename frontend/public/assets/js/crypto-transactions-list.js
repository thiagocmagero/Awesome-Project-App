(function () {
    "use strict";
  
         /* Newtasks */
         var options = {
          series: [
              {
                  data: [20, 14, 20, 22, 9, 12, 19, 10, 25],
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
      var chart = new ApexCharts(document.querySelector("#newtaskschart"), options);
      chart.render();
      /* Newtasks */

      /* Completed Tasks */
      var options = {
        series: [
            {
                data: [25, 10, 19, 12, 9, 22, 20, 14, 20],
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
        colors: ["rgba(255, 90, 41)"],
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
    var chart = new ApexCharts(document.querySelector("#completetaskschart"), options);
    chart.render();
    /* Completed Tasks */

      /* ongoing Tasks */
      var options = {
        series: [
            {
                data: [12, 20, 10, 25, 19, 22, 20, 23, 9],
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
        colors: ["rgba(12, 199, 99)"],
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
    var chart = new ApexCharts(document.querySelector("#ongoingtaskschart"), options);
    chart.render();
    /* ongoing Tasks */
  
         /* pending Tasks */
         var options = {
          series: [
              {
                  data: [20, 14, 20, 22, 9, 12, 19, 10, 25],
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
          colors: ["rgba(12, 156, 252)"],
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
      var chart = new ApexCharts(document.querySelector("#pendingtaskschart"), options);
      chart.render();
      /* pending Tasks */

          /* inreview Tasks */
          var options = {
            series: [
                {
                    data: [14, 25, 20, 22, 9, 12, 19, 10, 25],
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
            colors: ["rgba(255, 154, 19)"],
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
        var chart = new ApexCharts(document.querySelector("#reviewtaskschart"), options);
        chart.render();
        /* inreview Tasks */
  
  })();