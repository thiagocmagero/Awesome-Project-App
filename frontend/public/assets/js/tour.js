(function () {
    "use strict";

    const tour = new Shepherd.Tour({
        defaultStepOptions: {
            cancelIcon: {
                enabled: true
            },
            classes: 'class-1 class-2',
            scrollTo: { behavior: 'smooth', block: 'center' }
        },
        useModalOverlay: {
            enabled: true,
        }
    });

    tour.addStep({
        id: 'step-1',
        title: "Welcome To Our Tour App",
        text: 'Tailor your travel experience with handpicked destinations, activities, and accommodations suited to your preferences.',
        attachTo: {
            element: '#step-1',
            on: 'bottom',
        },
        buttons: [
            {
                text: 'Next',
                action: tour.next,
            },
        ],
    });

    tour.addStep({
        id: 'step-2',
        title: "Choose a Destination",
        text: 'Select a destination that aligns with the interests and preferences of the group.',
        attachTo: {
            element: '#step-2',
            on: 'bottom',
        },
        buttons: [
            {
                text: 'Next',
                action: tour.next,
            },
        ],
    });

    tour.addStep({
        id: 'Set a Budget',
        title: "Book Transportation and Accommodation",
        text: 'Determine a budget covering transportation, accommodation, meals, and activities.',
        attachTo: {
            element: '#step-3',
            on: 'bottom',
        },
        buttons: [
            {
                text: 'Next',
                action: tour.next,
            },
        ],
    });

    tour.addStep({
        id: 'step-3',
        title: "Book Transportation and Accommodation",
        text: 'Secure transportation to and from the destination, and book suitable accommodations.',
        attachTo: {
            element: '#step-4',
            on: 'bottom',
        },
        buttons: [
            {
                text: 'Next',
                action: tour.next,
            },
        ],
    });

    tour.addStep({
        id: 'step-5',
        title: "Plan Activities",
        text: 'Outline key activities or attractions for each day of the tour.',
        attachTo: {
            element: '#step-5',
            on: 'bottom',
        },
        buttons: [
            {
                text: 'Next',
                action: tour.next,
            },
        ],
    });

    tour.addStep({
        id: 'step-6',
        title: "Communicate and Confirm",
        text: 'Share the itinerary with participants, confirm bookings, and ensure everyone is prepared for the tour.',
        attachTo: {
            element: '#step-6',
            on: 'bottom',
        },
        buttons: [
            {
                text: 'Next',
                action: tour.next,
            },
        ],
    });
    
    tour.addStep({
        id: 'step-7',
        title: "Start Your Journey",
        text: 'Share the itinerary with participants, confirm bookings, and ensure everyone is prepared for the tour.',
        attachTo: {
            element: '#step-7',
            on: 'bottom',
        },
        buttons: [
            {
                text: 'Finish',
                action: tour.next,
            },
        ],
    });

    tour.start();

})();