(function () {
  "use strict";

  /* Bitcoin Chart */
  let options1 = {
    series: [{
      data: [0, 32, 18, 58,45,45,35,56,34,55,75,46,76]
    }],
    chart: {
      height: 40,
      type: 'area',
      fontFamily: 'Poppins, Arial, sans-serif',
      foreColor: '#5d6162',
      zoom: {
        enabled: false
      },
      sparkline: {
        enabled: true
      }
    },
    tooltip: {
      enabled: true,
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
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'straight'
    },
    title: {
      text: undefined,
    },
    grid: {
      borderColor: 'transparent',
    },
    xaxis: {
      crosshairs: {
        show: false,
      }
    },
    colors: ["var(--primary-color)"],
    stroke: {
      width: [1.5],
    },
    fill: {
      type: 'gradient',
      gradient: {
        opacityFrom: 0.5,
        opacityTo: 0.2,
        stops: [0, 60],
        colorStops: [
          [
            {
              offset: 0,
              color: 'var(--primary02)',
              opacity: 1
            },
            {
              offset: 60,
              color: 'var(--primary02)',
              opacity: 0.1
            }
          ],
        ]
      }
    },
  };
  const chart = new ApexCharts(document.querySelector("#btc-chart"), options1);
  chart.render();

  /* Etherium Chart */
  let options2 = {
    series: [{
      data: [76, 46, 75, 55, 34, 56, 35, 45, 45, 58, 18, 32, 0]
    }],
    chart: {
      height: 40,
      type: 'area',
      fontFamily: 'Poppins, Arial, sans-serif',
      foreColor: '#5d6162',
      zoom: {
        enabled: false
      },
      sparkline: {
        enabled: true
      }
    },
    tooltip: {
      enabled: true,
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
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'straight'
    },
    title: {
      text: undefined,
    },
    grid: {
      borderColor: 'transparent',
    },
    xaxis: {
      crosshairs: {
        show: false,
      }
    },
    colors: ["rgba(255, 90, 41)"],
    stroke: {
      width: [1.5],
    },
    fill: {
      type: 'gradient',
      gradient: {
        opacityFrom: 0.5,
        opacityTo: 0.2,
        stops: [0, 60],
        colorStops: [
          [
            {
              offset: 0,
              color: 'rgba(255, 90, 41,0.2)',
              opacity: 1
            },
            {
              offset: 60,
              color: 'rgba(255, 90, 41,0.2)',
              opacity: 0.1
            }
          ],
        ]
      }
    },
  };
  const chart1 = new ApexCharts(document.querySelector("#eth-chart"), options2);
  chart1.render();

  /* Dash Chart */
  let options3 = {
    series: [{
      data: [0, 32, 18, 58,45,45,35,56,34,55,75,46,76]
    }],
    chart: {
      height: 40,
      type: 'area',
      fontFamily: 'Poppins, Arial, sans-serif',
      foreColor: '#5d6162',
      zoom: {
        enabled: false
      },
      sparkline: {
        enabled: true
      }
    },
    tooltip: {
      enabled: true,
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
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'straight'
    },
    title: {
      text: undefined,
    },
    grid: {
      borderColor: 'transparent',
    },
    xaxis: {
      crosshairs: {
        show: false,
      }
    },
    colors: ["rgba(12, 199, 99)"],
    stroke: {
      width: [1.5],
    },
    fill: {
      type: 'gradient',
      gradient: {
        opacityFrom: 0.5,
        opacityTo: 0.2,
        stops: [0, 60],
        colorStops: [
          [
            {
              offset: 0,
              color: 'rgba(12, 199, 99,0.2)',
              opacity: 1
            },
            {
              offset: 60,
              color: 'rgba(12, 199, 99,0.2)',
              opacity: 0.1
            }
          ],
        ]
      }
    },
  };
  const chart2 = new ApexCharts(document.querySelector("#dash-chart"), options3);
  chart2.render();

    /* bsd Chart */
    let options4 = {
      series: [{
        data: [76, 46, 75, 55, 34, 56, 35, 45, 45, 58, 18, 32, 0]
      }],
      chart: {
        height: 40,
        width: 120,
        type: 'area',
        fontFamily: 'Poppins, Arial, sans-serif',
        foreColor: '#5d6162',
        zoom: {
          enabled: false
        },
        sparkline: {
          enabled: true
        }
      },
      tooltip: {
        enabled: true,
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
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'straight'
      },
      title: {
        text: undefined,
      },
      grid: {
        borderColor: 'transparent',
      },
      xaxis: {
        crosshairs: {
          show: false,
        }
      },
      colors: ["rgba(12, 156, 252)"],
      stroke: {
        width: [1.5],
      },
      fill: {
        type: 'gradient',
        gradient: {
          opacityFrom: 0.5,
          opacityTo: 0.2,
          stops: [0, 60],
          colorStops: [
            [
              {
                offset: 0,
                color: 'rgba(12, 156, 252,0.2)',
                opacity: 1
              },
              {
                offset: 60,
                color: 'rgba(12, 156, 252,0.2)',
                opacity: 0.1
              }
            ],
          ]
        }
      },
    };
    const chart3 = new ApexCharts(document.querySelector("#bsd-chart"), options4);
    chart3.render();

})();
