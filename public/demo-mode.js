(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const isDemoMode = urlParams.get('demo') === 'true';

    if (!isDemoMode) {
        return;
    }

    const fillInputField = (selector, value, parentElement = document) => {
        try {
            const inputField = parentElement.querySelector(selector);
            if (inputField) {
                if (inputField.type === 'date') {
                    const today = new Date();
                    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                    inputField.value = nextWeek.toISOString().split('T')[0];
                } else if (inputField.type === 'time') {
                    inputField.value = value;
                } else if (inputField.tagName === 'SELECT') {
                    const option = inputField.querySelector(`option[value="${value}"]`);
                    if (option) {
                        inputField.value = value;
                    } else {
                        const firstOption = inputField.querySelector('option:not([disabled])');
                        if (firstOption) {
                            inputField.value = firstOption.value;
                        }
                    }
                } else {
                    inputField.value = value;
                }
                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                inputField.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`Demo Mode: Filled "${selector}" with "${value}"`);
                return true;
            }
        } catch (e) {
            console.error(`Demo Mode Error filling field "${selector}":`, e);
        }
        return false;
    };

    document.addEventListener('DOMContentLoaded', () => {
        console.log('TableSocial Demo Mode Activated!');

        console.log('Demo Mode: Attempting to fill location search...');
        const possibleLocationInputs = [
            'input#location-search',
            'input[name="location"]',
            'input[placeholder*="city"]',
            'input[placeholder*="location"]',
            'input[aria-label*="location"]',
            'input.location-input',
            'input[type="search"]'
        ];
        for (const selector of possibleLocationInputs) {
            if (fillInputField(selector, 'Victoria, BC')) {
                setTimeout(() => {
                    const searchButton = document.querySelector('button[type="submit"][aria-label*="search"], button.search-button, .search-icon, button[title*="Search"]');
                    if (searchButton) {
                        searchButton.click();
                        console.log('Demo Mode: Clicked search button after filling location.');
                    }
                }, 500);
                break;
            }
        }

        console.log('Demo Mode: Attempting to fill a booking form...');
        const bookingForm = document.querySelector('form[name="bookingForm"], form#booking-form, form.booking-form, form[action*="book"], form[action*="reserve"]');
        if (bookingForm) {
            console.log('Demo Mode: Found a potential booking form. Filling fields...');
            fillInputField('input[name="dinerName"]', 'Demo Diner', bookingForm);
            fillInputField('input[name="firstName"]', 'Demo', bookingForm);
            fillInputField('input[name="lastName"]', 'Diner', bookingForm);
            fillInputField('input[name="email"]', 'demo.diner@tablesocial.live', bookingForm);
            fillInputField('input[name="phone"]', '250-555-1234', bookingForm);
            fillInputField('input[name="quantity"], input[type="number"][min="1"]', '2', bookingForm);
            fillInputField('textarea[name="specialRequests"], textarea[placeholder*="requests"]', 'Allergies: shellfish. Please seat us near a window if possible!', bookingForm);
            
            const termsCheckbox = bookingForm.querySelector('input[type="checkbox"][name*="terms"], input[type="checkbox"]#terms-agree');
            if (termsCheckbox && !termsCheckbox.checked) {
                termsCheckbox.checked = true;
                termsCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('Demo Mode: Checked terms & conditions checkbox.');
            }

            setTimeout(() => {
                const submitButton = bookingForm.querySelector('button[type="submit"], input[type="submit"]');
                if (submitButton) {
                    submitButton.click();
                    console.log('Demo Mode: Automatically clicked booking form submit button.');
                }
            }, 3000);
        }

        console.log('Demo Mode: Attempting to fill an event creation form...');
        const eventCreationForm = document.querySelector('form[name="createEventForm"], form#create-event-form, form.event-form, form[action*="create-event"], form[action*="add-event"]');
        if (eventCreationForm) {
            console.log('Demo Mode: Found a potential event creation form. Filling fields...');
            fillInputField('input[name="eventTitle"], input[id="event-title"]', 'Secret Garden Pop-Up Dinner', eventCreationForm);
            fillInputField('textarea[name="eventDescription"], textarea[id="event-description"]', 'An exclusive 5-course tasting menu featuring local, seasonal ingredients by Chef Alex and Sommelier Jane. Experience a unique blend of flavors in a hidden urban garden setting. Limited to 12 guests.', eventCreationForm);
            fillInputField('input[name="eventLocation"], input[id="event-location"]', '123 Garden Lane, Victoria, BC', eventCreationForm);
            fillInputField('input[type="date"][name="eventDate"], input[type="date"][id="event-date"]', null, eventCreationForm);
            fillInputField('input[type="time"][name="eventTime"], input[type="time"][id="event-time"]', '19:00', eventCreationForm);
            fillInputField('input[name="eventPrice"], input[id="event-price"]', '125.00', eventCreationForm);
            fillInputField('input[name="eventCapacity"], input[id="event-capacity"]', '12', eventCreationForm);
            fillInputField('input[name="organizerName"], input[id="organizer-name"]', 'Chef Alex & Sommelier Jane', eventCreationForm);
            fillInputField('input[name="contactEmail"], input[id="contact-email"]', 'chef.alex@tablesocial.live', eventCreationForm);
            
            fillInputField('select[name="eventType"], select[id="event-type"]', 'Pop-Up Dinner', eventCreationForm);
            fillInputField('select[name="cuisineType"], select[id="cuisine-type"]', 'Modern Canadian', eventCreationForm);

            console.log('Demo Mode: Note: Image upload fields cannot be auto-filled for security reasons.');

            setTimeout(() => {
                const submitButton = eventCreationForm.querySelector('button[type="submit"], input[type="submit"]');
                if (submitButton) {
                    submitButton.click();
                    console.log('Demo Mode: Automatically clicked event creation form submit button.');
                }
            }, 3000);
        }
    });
})();
