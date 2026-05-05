(function() {
    "use strict";

    var myElement1 = document.getElementById('files-main-nav');
    new SimpleBar(myElement1, { autoHide: true });

    var myElement3 = document.getElementById('filemanager-file-details');
    new SimpleBar(myElement3, { autoHide: true });

     /* dropzone */
     let myDropzone = new Dropzone(".dropzone");
     myDropzone.on("addedfile", file => {
 });

 var options = {
    series: [18235, 12743, 5369, 16458],
    labels: ["male", "Female", "Others", "Not Mentioned"],
    chart: {
      height: 220,
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
  var chart = new ApexCharts(document.querySelector("#file-manager-storage"), options);
  chart.render();


})();