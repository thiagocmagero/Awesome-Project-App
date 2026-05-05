(function () {
  "use strict";

  /* BTC Chart */
  var total = {
    chart: {
      type: 'area',
      height: 50,
      sparkline: {
        enabled: true,
      },
      dropShadow: {
        enabled: true,
        enabledOnSeries: undefined,
        top: 0,
        left: 0,
        blur: 1,
        color: "#fff",
        opacity: 0.05,
      },
    },
    stroke: {
      show: true,
      curve: "smooth",
      lineCap: "butt",
      colors: undefined,
      width: 1.5,
      dashArray: 0,
    },
    fill: {
      gradient: {
        enabled: false,
      },
    },
    series: [
      {
        name: "Value",
        data: [47, 45, 54, 38, 56, 24, 65, 31, 37, 39, 62, 51, 35, 41, 35, 27, 93, 53, 61, 27, 54, 43, 19, 46],
      },
    ],
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
                      color: "var(--primary005)",
                      opacity: 0.1
                  },
                  {
                      offset: 75,
                      color: "var(--primary01)",
                      opacity: 0.5
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
      min: 0,
      show: false,
    },
    xaxis: {
      axisBorder: {
        show: false,
      },
    },
    yaxis: {
      axisBorder: {
        show: false,
      },
    },
    colors: ["var(--primary-color)"],
    tooltip: {
      enabled: false,
    },
  };
  document.getElementById("btc-currency-chart").innerHTML = "";
  var total = new ApexCharts(
    document.querySelector("#btc-currency-chart"),
    total
  );
  total.render();
  /* BTC Chart */

  /* ETH Chart */
  var total = {
    chart: {
      type: "area",
      height: 50,
      sparkline: {
        enabled: true,
      },
      dropShadow: {
        enabled: true,
        enabledOnSeries: undefined,
        top: 0,
        left: 0,
        blur: 1,
        color: "#fff",
        opacity: 0.05,
      },
    },
    stroke: {
      show: true,
      curve: "smooth",
      lineCap: "butt",
      colors: undefined,
      width: 1.5,
      dashArray: 0,
    },
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
                      color: "rgba(255, 90, 41, 0.05)",
                      opacity: 0.1
                  },
                  {
                      offset: 75,
                      color: "rgba(255, 90, 41, 0.1)",
                      opacity: 0.5
                  },
                  {
                      offset: 100,
                      color: 'rgba(255, 90, 41, 0.2)',
                      opacity: 1
                  }
              ],
          ]
      }
  },
    series: [
      {
        name: "Value",
        data: [47, 45, 54, 38, 56, 24, 65, 31, 37, 39, 62, 51, 35, 41, 35, 27, 93, 53, 61, 27, 54, 43, 19, 46],
      },
    ],
    yaxis: {
      min: 0,
      show: false,
    },
    xaxis: {
      axisBorder: {
        show: false,
      },
    },
    yaxis: {
      axisBorder: {
        show: false,
      },
    },
    colors: ["rgb(255, 90, 41)"],
    tooltip: {
      enabled: false,
    },
  };
  document.getElementById("eth-currency-chart").innerHTML = "";
  var total = new ApexCharts(
    document.querySelector("#eth-currency-chart"),
    total
  );
  total.render();
  /* ETH Chart */

  /* Dash Chart */
  var total = {
    chart: {
      type: "area",
      height: 50,
      sparkline: {
        enabled: true,
      },
      dropShadow: {
        enabled: true,
        enabledOnSeries: undefined,
        top: 0,
        left: 0,
        blur: 1,
        color: "#fff",
        opacity: 0.05,
      },
    },
    stroke: {
      show: true,
      curve: "smooth",
      lineCap: "butt",
      colors: undefined,
      width: 1.5,
      dashArray: 0,
    },
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
                      color: "rgba(12, 199, 99, 0.05)",
                      opacity: 0.1
                  },
                  {
                      offset: 75,
                      color: "rgba(12, 199, 99, 0.1)",
                      opacity: 0.5
                  },
                  {
                      offset: 100,
                      color: 'rgba(12, 199, 99, 0.2)',
                      opacity: 1
                  }
              ],
          ]
      }
  },
    series: [
      {
        name: "Value",
        data: [47, 45, 54, 38, 56, 24, 65, 31, 37, 39, 62, 51, 35, 41, 35, 27, 93, 53, 61, 27, 54, 43, 19, 46],
      },
    ],
    yaxis: {
      min: 0,
      show: false,
    },
    xaxis: {
      axisBorder: {
        show: false,
      },
    },
    yaxis: {
      axisBorder: {
        show: false,
      },
    },
    colors: ["rgb(12, 199, 99)"],
    tooltip: {
      enabled: false,
    },
  };
  document.getElementById("dash-currency-chart").innerHTML = "";
  var total = new ApexCharts(
    document.querySelector("#dash-currency-chart"),
    total
  );
  total.render();
  /* Dash Chart */

  /* LTC Chart */
  var total = {
    chart: {
      type: "area",
      height: 50,
      sparkline: {
        enabled: true,
      },
      dropShadow: {
        enabled: true,
        enabledOnSeries: undefined,
        top: 0,
        left: 0,
        blur: 1,
        color: "#fff",
        opacity: 0.05,
      },
    },
    stroke: {
      show: true,
      curve: "smooth",
      lineCap: "butt",
      colors: undefined,
      width: 1.5,
      ltcArray: 0,
    },
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
                      color: "rgba(12, 156, 252, 0.05)",
                      opacity: 0.1
                  },
                  {
                      offset: 75,
                      color: "rgba(12, 156, 252, 0.1)",
                      opacity: 0.5
                  },
                  {
                      offset: 100,
                      color: 'rgba(12, 156, 252, 0.2)',
                      opacity: 1
                  }
              ],
          ]
      }
  },
    series: [
      {
        name: "Value",
        data: [47, 45, 54, 38, 56, 24, 65, 31, 37, 39, 62, 51, 35, 41, 35, 27, 93, 53, 61, 27, 54, 43, 19, 46],
      },
    ],
    yaxis: {
      min: 0,
      show: false,
    },
    xaxis: {
      axisBorder: {
        show: false,
      },
    },
    yaxis: {
      axisBorder: {
        show: false,
      },
    },
    colors: ["rgb(12, 156, 252)"],
    tooltip: {
      enabled: false,
    },
  };
  document.getElementById("ltc-currency-chart").innerHTML = "";
  var total = new ApexCharts(
    document.querySelector("#ltc-currency-chart"),
    total
  );
  total.render();
  /* LTC Chart */

  /* XRS Chart */
  var total = {
    chart: {
      type: "area",
      height: 50,
      sparkline: {
        enabled: true,
      },
      dropShadow: {
        enabled: true,
        enabledOnSeries: undefined,
        top: 0,
        left: 0,
        blur: 1,
        color: "#fff",
        opacity: 0.05,
      },
    },
    stroke: {
      show: true,
      curve: "smooth",
      lineCap: "butt",
      colors: undefined,
      width: 1.5,
      ltcArray: 0,
    },
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
                      color: "rgba(255, 56, 60, 0.05)",
                      opacity: 0.1
                  },
                  {
                      offset: 75,
                      color: "rgba(255, 56, 60, 0.1)",
                      opacity: 0.5
                  },
                  {
                      offset: 100,
                      color: 'rgba(255, 56, 60, 0.2)',
                      opacity: 1
                  }
              ],
          ]
      }
  },
    series: [
      {
        name: "Value",
        data: [47, 45, 54, 38, 56, 24, 65, 31, 37, 39, 62, 51, 35, 41, 35, 27, 93, 53, 61, 27, 54, 43, 19, 46],
      },
    ],
    yaxis: {
      min: 0,
      show: false,
    },
    xaxis: {
      axisBorder: {
        show: false,
      },
    },
    yaxis: {
      axisBorder: {
        show: false,
      },
    },
    colors: ["rgb(255, 56, 60)"],
    tooltip: {
      enabled: false,
    },
  };
  document.getElementById("xrs-currency-chart").innerHTML = "";
  var total = new ApexCharts(
    document.querySelector("#xrs-currency-chart"),
    total
  );
  total.render();
  /* XRS Chart */

  /* GLM Chart */
  var total = {
    chart: {
      type: "area",
      height: 50,
      sparkline: {
        enabled: true,
      },
      dropShadow: {
        enabled: true,
        enabledOnSeries: undefined,
        top: 0,
        left: 0,
        blur: 1,
        color: "#fff",
        opacity: 0.05,
      },
    },
    stroke: {
      show: true,
      curve: "smooth",
      lineCap: "butt",
      colors: undefined,
      width: 1.5,
      ltcArray: 0,
    },
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
                      color: "rgba(0, 216, 216, 0.05)",
                      opacity: 0.1
                  },
                  {
                      offset: 75,
                      color: "rgba(0, 216, 216, 0.1)",
                      opacity: 0.5
                  },
                  {
                      offset: 100,
                      color: 'rgba(0, 216, 216, 0.2)',
                      opacity: 1
                  }
              ],
          ]
      }
  },
    series: [
      {
        name: "Value",
        data: [47, 45, 54, 38, 56, 24, 65, 31, 37, 39, 62, 51, 35, 41, 35, 27, 93, 53, 61, 27, 54, 43, 19, 46],
      },
    ],
    yaxis: {
      min: 0,
      show: false,
    },
    xaxis: {
      axisBorder: {
        show: false,
      },
    },
    yaxis: {
      axisBorder: {
        show: false,
      },
    },
    colors: ["rgb(0, 216, 216)"],
    tooltip: {
      enabled: false,
    },
  };
  document.getElementById("glm-currency-chart").innerHTML = "";
  var total = new ApexCharts(
    document.querySelector("#glm-currency-chart"),
    total
  );
  total.render();
  /* GLM Chart */

  /* Monero Chart */
  var total = {
    chart: {
      type: "area",
      height: 50,
      sparkline: {
        enabled: true,
      },
      dropShadow: {
        enabled: true,
        enabledOnSeries: undefined,
        top: 0,
        left: 0,
        blur: 1,
        color: "#fff",
        opacity: 0.05,
      },
    },
    stroke: {
      show: true,
      curve: "smooth",
      lineCap: "butt",
      colors: undefined,
      width: 1.5,
      ltcArray: 0,
    },
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
                      color: "rgba(254, 84, 155, 0.05)",
                      opacity: 0.1
                  },
                  {
                      offset: 75,
                      color: "rgba(254, 84, 155, 0.1)",
                      opacity: 0.5
                  },
                  {
                      offset: 100,
                      color: 'rgba(254, 84, 155, 0.2)',
                      opacity: 1
                  }
              ],
          ]
      }
  },
    series: [
      {
        name: "Value",
        data: [47, 45, 54, 38, 56, 24, 65, 31, 37, 39, 62, 51, 35, 41, 35, 27, 93, 53, 61, 27, 54, 43, 19, 46],
      },
    ],
    yaxis: {
      min: 0,
      show: false,
    },
    xaxis: {
      axisBorder: {
        show: false,
      },
    },
    yaxis: {
      axisBorder: {
        show: false,
      },
    },
    colors: ["rgb(254, 84, 155)"],
    tooltip: {
      enabled: false,
    },
  };
  document.getElementById("monero-currency-chart").innerHTML = "";
  var total = new ApexCharts(
    document.querySelector("#monero-currency-chart"),
    total
  );
  total.render();
  /* Monero Chart */

  /* Eos Chart */
  var total = {
    chart: {
      type: "area",
      height: 50,
      sparkline: {
        enabled: true,
      },
      dropShadow: {
        enabled: true,
        enabledOnSeries: undefined,
        top: 0,
        left: 0,
        blur: 1,
        color: "#fff",
        opacity: 0.05,
      },
    },
    stroke: {
      show: true,
      curve: "smooth",
      lineCap: "butt",
      colors: undefined,
      width: 1.5,
      ltcArray: 0,
    },
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
                      color: "rgba(255, 154, 19, 0.05)",
                      opacity: 0.1
                  },
                  {
                      offset: 75,
                      color: "rgba(255, 154, 19, 0.1)",
                      opacity: 0.5
                  },
                  {
                      offset: 100,
                      color: 'rgba(255, 154, 19, 0.2)',
                      opacity: 1
                  }
              ],
          ]
      }
  },
    series: [
      {
        name: "Value",
        data: [47, 45, 54, 38, 56, 24, 65, 31, 37, 39, 62, 51, 35, 41, 35, 27, 93, 53, 61, 27, 54, 43, 19, 46],
      },
    ],
    yaxis: {
      min: 0,
      show: false,
    },
    xaxis: {
      axisBorder: {
        show: false,
      },
    },
    yaxis: {
      axisBorder: {
        show: false,
      },
    },
    colors: ["rgb(255, 154, 19)"],
    tooltip: {
      enabled: false,
    },
  };
  document.getElementById("eos-currency-chart").innerHTML = "";
  var total = new ApexCharts(
    document.querySelector("#eos-currency-chart"),
    total
  );
  total.render();
  /* Eos Chart */

})();
