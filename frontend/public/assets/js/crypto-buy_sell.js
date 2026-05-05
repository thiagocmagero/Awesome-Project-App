(function() {
    "use strict"

    var options = {
        series: [ {
          name: 'Last Week',
          type: 'line',
          data:[44, 42, 57, 86, 112, 55, 70, 43, 23, 54, 77, 34]
        }, {
          name: 'Average',
          type: 'area',
          data: [20, 88, 78, 120, 80, 95, 35, 88, 60, 95, 85, 90]
        }],
        chart: {
          height: 380,
          type: 'line',
          stacked: false,
          toolbar: {
            show: false
          },
          dropShadow: {
            enabled: true,
            enabledOnSeries: undefined,
            top: 10,
            left: 0,
            blur: 0,
            color:  ["rgba(255, 90, 41,0.8)", "var(--primary08)"],
            opacity: 0.05
          },
        },
        colors: ["rgba(255, 90, 41,1)", "var(--primary-color)"],
        fill: {
          type: ['solid', 'gradient', 'solid'],
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
                  color: 'var(--primary005)',
                  opacity: 1
                }
              ],
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
                    color: 'var(--primary01)',
                    opacity: 1
                  }
              ],
            ]
          }
        },
        grid: {
          show: true,
          borderColor: 'rgba(119, 119, 142, 0.1)',
          strokeDashArray: 4,
        },
        stroke: {
          width: [1.5, 1.5],
          curve: 'smooth',
          dashArray: [6,0]
        },
        plotOptions: {
          bar: {
            columnWidth: '25%',
            borderRadius: 5,
          }
        },
        labels:['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'sep', 'oct', 'nov', 'dec'],
        markers: {
          size: 0,
        },
        legend: {
          show: true,
          position: 'top',
          fontFamily: "Montserrat",
          markers: {
           size: 4,
          }
        },
        xaxis: {
          fontFamily: "Montserrat",
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
        },
        yaxis: {
            min:0,
          title: {
            style: {
              color: '	#adb5be',
              fontSize: '14px',
              fontFamily: 'Montserrat, sans-serif',
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
        tooltip: {
          shared: true,
          intersect: false,
          y: {
            formatter: function (y) {
              if (typeof y !== "undefined") {
                return y.toFixed(0) + " Hours";
              }
              return y;
    
            }
          }
        }
      };
      var chart = new ApexCharts(document.querySelector("#buy_sell-statistics"), options);
      chart.render();

})()