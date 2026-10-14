/**
 * ATS (Applicant Tracking Systems) usados por las páginas de "Trabaja con
 * nosotros" de muchas empresas. Sus formularios tienen nombres de campo
 * estables, por eso aquí se fijan con selectores.
 */
(function (global) {
    "use strict";

    const { register } = global.FillPro.siteRegistry;

    // Greenhouse (boards.greenhouse.io / job-boards.greenhouse.io)
    register({
        id: "greenhouse",
        name: "Greenhouse",
        hostPatterns: [/(^|\.)greenhouse\.io$/],
        fieldRules: [
            { key: "firstName", selectors: ["#first_name", "input[name='job_application[first_name]']"] },
            { key: "lastName", selectors: ["#last_name", "input[name='job_application[last_name]']"] },
            { key: "email", selectors: ["#email", "input[name='job_application[email]']"] },
            { key: "phone", selectors: ["#phone", "input[name='job_application[phone]']"] },
            { key: "location", selectors: ["#candidate-location", "#job_application_location"] }
        ]
    });

    // Lever (jobs.lever.co)
    register({
        id: "lever",
        name: "Lever",
        hostPatterns: [/(^|\.)lever\.co$/],
        fieldRules: [
            { key: "fullName", selectors: ["input[name='name']"] },
            { key: "email", selectors: ["input[name='email']"] },
            { key: "phone", selectors: ["input[name='phone']"] },
            { key: "currentCompany", selectors: ["input[name='org']"] },
            { key: "location", selectors: ["input[name='location']"] },
            { key: "linkedin", selectors: ["input[name='urls[LinkedIn]']"] },
            { key: "github", selectors: ["input[name='urls[GitHub]']"] },
            { key: "portfolio", selectors: ["input[name='urls[Portfolio]']"] }
        ]
    });

    // Workday (*.myworkdayjobs.com) — el teléfono se pide sin indicativo.
    register({
        id: "workday",
        name: "Workday",
        hostPatterns: [/(^|\.)myworkdayjobs\.com$/, /(^|\.)myworkdaysite\.com$/],
        fieldRules: [
            { key: "firstName", selectors: ["input[data-automation-id='legalNameSection_firstName']", "input[id$='legalName--firstName']"] },
            { key: "lastName", selectors: ["input[data-automation-id='legalNameSection_lastName']", "input[id$='legalName--lastName']"] },
            { key: "email", selectors: ["input[data-automation-id='email']"] },
            { key: "address", selectors: ["input[data-automation-id='addressSection_addressLine1']", "input[id$='address--addressLine1']"] },
            { key: "city", selectors: ["input[data-automation-id='addressSection_city']", "input[id$='address--city']"] },
            { key: "postalCode", selectors: ["input[data-automation-id='addressSection_postalCode']", "input[id$='address--postalCode']"] },
            { key: "phoneNational", selectors: ["input[data-automation-id='phone-number']", "input[id$='phoneNumber--phoneNumber']"] }
        ]
    });
})(globalThis);
