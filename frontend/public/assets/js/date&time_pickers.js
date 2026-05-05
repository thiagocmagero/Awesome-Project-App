(function () {
    "use strict";
    
    /* To choose date */
    flatpickr("#date", {disableMobile: true});

    /* To choose date and time */
    flatpickr("#datetime", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        disableMobile: true
    });

    /* For Human Friendly dates */
    flatpickr("#humanfrienndlydate", {
        altInput: true,
        altFormat: "F j, Y",
        dateFormat: "Y-m-d",
        disableMobile: true
    });

    /* For Date Range Picker */
    flatpickr("#daterange", {
        mode: "range",
        dateFormat: "Y-m-d",
        disableMobile: true
    });

    /* For Time Picker */
    flatpickr("#timepikcr", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        disableMobile: true
    });

    /* For Time Picker With 24hr Format */
    flatpickr("#timepickr1", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true,
        disableMobile: true
    });

    /* For Time Picker With Limits */
    flatpickr("#limittime", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        minTime: "16:00",
        maxTime: "22:30",
        disableMobile: true
    });

    /* For DateTimePicker with Limited Time Range */
    flatpickr("#limitdatetime", {
        enableTime: true,
        minTime: "16:00",
        maxTime: "22:00",
        disableMobile: true
    });

    /* For Inline Calendar */
    flatpickr("#inlinecalendar", {
        inline: true,
        disableMobile: true
    });

    /* For Date Pickr With Week Numbers */
    flatpickr("#weeknum", {
        weekNumbers: true,
        disableMobile: true
    });

    /* For Inline Time */
    flatpickr("#inlinetime", {
        inline: true,
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        disableMobile: true
    });

    /* For Preloading Time */
    flatpickr("#pretime", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        defaultDate: "13:45",
        disableMobile: true
    });

})();