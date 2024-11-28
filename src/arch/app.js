import plantuml from './plantuml.js';
import util from './util.js';
// PRODUCTION
/*
const URL_API_ENDPOINT = "https://releasetrain.io/api";
const urlSelectOptions = "https://releasetrain.io/api/c/names";
const URL_HOMEPAGE = "https://releasetrain.io";
*/

// DEVELOPMENT
const URL_API_ENDPOINT = "https://releasetrain.io/api";
const urlSelectOptions = "https://releasetrain.io/api/c/names";
const urlSelectOS = "https://releasetrain.io/api/c/os";
const URL_HOMEPAGE = "http://localhost:8080/src";

let versions = [];
let osList = [];
let tree = {};
let counterId = 0;

const urlParams = new URLSearchParams(window.location.search);
const q = urlParams.get('q') === null ? "" : urlParams.get('q');

$.ajax({
    url: `${URL_API_ENDPOINT}/component?q=${encodeURIComponent(q)}`,
    type: 'GET',
    dataType: 'json',
    success: handleData,
    error: function (jqXHR, textStatus, errorThrown) {
        console.error("Error fetching data:", textStatus, errorThrown);
    }
});

$.ajax({
    url: `${urlSelectOS}`,
    type: 'GET',
    dataType: 'json',
    success: handleOsData,
    error: function (jqXHR, textStatus, errorThrown) {
        console.error("Error fetching data:", textStatus, errorThrown);
    }
});

function handleOsData(data) {
    if (!Array.isArray(data)) {
        console.error("Data is not an array");
        return;
    }
    osList = data;
}

function handleData(data) {
    console.log(data)

    if (data['q'] === undefined) {
        data = data;
    } else {
        data = data['q'];
    }

    // console.log("Array length", data.length);
    if (!Array.isArray(data)) {
        console.error("Data is not an array");
        return;
    }

    const sortedData = sortByDate(data);

    versions.push(...sortedData);

    versionsToTree();

    plantuml.initialize('../app/node_modules/@sakirtemel/plantuml.js')
        .then(() => {
            renderDiagrams(getPlantuml());
        })
        .catch((error) => {
            console.error('Error initializing PlantUML:', error);
        });
}

$('#mySelect2').select2({
    ajax: {
        url: urlSelectOptions,
        processResults: function (data) {
            counterId = 1000;
            let resultsArray = [];
            data.forEach(version => {

                if (version.hasOwnProperty('versionProductName') === false) {
                    return;
                }

                if (util.isFirstLetterAlphabetic(version.versionProductName) === false) {
                    return;
                }

                resultsArray.push({ "id": counterId, "text": version.versionProductName })

                counterId = counterId + 1;
            })

            return {
                results: resultsArray
            };
        }
    }
});

$('#mySelect2').on('change', function () {
    var selectedTexts = $(this).find(':selected').map(function () {
        return $(this).text();
    }).get();
    var valuesAsString = selectedTexts.join(',');
    var urlToCall = URL_HOMEPAGE + '/arch?q=' + valuesAsString;
    window.location.href = urlToCall;
});

q.split(",").forEach(component => {
    if (q === "") {
        return;
    }
    let initialValue = { id: counterId, text: component };
    let newOption = new Option(initialValue.text, initialValue.id, true, true);
    $('#mySelect2').append(newOption);
    counterId = counterId + 1;
})

function versionsToTree() {
    versions.forEach(v => {
        if (v.hasOwnProperty("versionPredictedComponentType") && v.versionPredictedComponentType.toUpperCase() === "OS") {
            const osKey = `${v.versionProductName}@${v.versionNumber.replace(/\./g, ":")}`;
            if (!tree.hasOwnProperty(osKey)) {
                tree[osKey] = { version: v };
            }
        }
        else {
            osList.forEach(os => {
                if (v.versionSearchTags.map(tag => tag.toLowerCase()).includes(os.toLowerCase())) {
                    const osKey = `${os}`;
                    if (!tree.hasOwnProperty(osKey)) {
                        tree[osKey] = { version: os };
                    }
                }
            });
        }
    });
    addLeafToTree();
}

function addLeafToTree() {
    for (const osKey in tree) {
        versions.forEach(v => {
            if (v.hasOwnProperty("versionPredictedComponentType") && v.versionPredictedComponentType.toUpperCase() !== "OS") {
                const osComponent = osKey.split("@")[0].toLowerCase();
                if (v.versionSearchTags.includes(osComponent)) {
                    tree[osKey][`${v.versionProductName}@${v.versionNumber.replace(/\./g, ":")}`] = { version: v };
                }
            }
        });
    }
}

function getPlantuml() {
    const plantUMLCode = `
@startuml
title Software Version Stacks and Hierarchies

package "Software Stack (LAMP)" {
    component "Linux OS" as Linux
    component "Apache Web Server" as Apache
    component "MySQL Database" as MySQL
    component "PHP Interpreter" as PHP
}

package "Single Database" {
    component "PostgreSQL Database" as PostgreSQL
}

package "Application Hierarchy" {
    component "Parent Service" as ParentService {
        component "Child Service A" as ChildA
        component "Child Service B" as ChildB {
            component "Grandchild Service" as Grandchild
        }
    }
}

' Relationships within the stack
Linux --> Apache : Hosts
Apache --> PHP : Executes
PHP --> MySQL : Queries

' Single database relationship example
PostgreSQL ..> PHP : Used by

' Hierarchy relationships
ParentService --> ChildA : Manages
ParentService --> ChildB : Manages
ChildB --> Grandchild : Delegates

@enduml
    `;
    return [{ name: "software-stacks-and-hierarchy", code: plantUMLCode }];
}

// function getPlantuml() {
//     const plantUMLCode = `
// @startuml
// title Nested, Stacked, and Sibling Components Diagram

// package "Frontend" {
//     component "Web Application" as WebApp
//     component "Frontend Helper" as FrontHelper
// }

// package "Backend" {
//     component "API Gateway" as APIGateway {
//         component "Authentication Service" as AuthService
//         component "Routing Service" as RoutingService
//     }

//     component "Database" as DB
// }

// WebApp --> APIGateway : Sends requests
// APIGateway --> AuthService : Validates
// APIGateway --> RoutingService : Routes
// AuthService --> DB : Reads/Writes user data
// RoutingService --> DB : Queries
// FrontHelper --> WebApp : Supports UI rendering

// @enduml
//     `;
//     return [{ name: "nested-stacked-sibling-diagram", code: plantUMLCode }];
// }

// function getPlantuml() {
//     const diagrams = [];
//     const addedOsComponents = new Set();

//     Object.entries(tree).forEach(([osComponent, componentData]) => {
//         if (!addedOsComponents.has(osComponent) && osComponent === "linux") {
//             let plantUMLCode = `
// @startuml
// package ${osComponent} {
// `;

//             // Add OS Component Class Properties
//             if (componentData.version?.versionNumber) {
//                 plantUMLCode += `
//     class ${osComponent} {
//         Version: ${componentData.version.versionNumber}
//         ReleaseDate: ${componentData.version.versionReleaseDate || "Unknown"}
//         ${componentData.version.versionReleaseChannel === "cve" ? "Note: Security Update" : ""}
//     }
// `;
//             }

//             // Add Subcomponents
//             plantUMLCode += `
//     package Subcomponents {
// `;

//             Object.entries(componentData).forEach(([component, data]) => {
//                 if (component !== "version") {
//                     plantUMLCode += `
//         class ${component} {
//             Version: ${data.version?.versionNumber || "Unknown"}
//             ReleaseDate: ${data.version?.versionReleaseDate || "Unknown"}
//             ${data.version?.versionReleaseChannel === "cve" ? "Note: Security Update" : ""}
//         }
// `;
//                 }
//             });

//             plantUMLCode += `
//     }
// }
// @enduml
// `;

//             diagrams.push({ name: `diagram-${osComponent}`, code: plantUMLCode });
//             addedOsComponents.add(osComponent);
//         }
//     });

//     return diagrams;
// }

// function getPlantuml() {
//     const plantUMLCode = `
// @startuml
// title Simple Component Diagram

// component "Web Application" as WebApp
// component "Database" as DB
// component "API Gateway" as APIGateway
// component "Authentication Service" as AuthService

// WebApp --> APIGateway : Uses
// APIGateway --> DB : Reads/Writes
// APIGateway --> AuthService : Authenticates

// @enduml
//     `;
//     return [{ name: "simple-component-diagram", code: plantUMLCode }];
// }

// function getPlantuml() {
//     const plantUMLCode = `
// @startuml
// title Nested, Stacked, and Sibling Components Diagram

// package "Frontend" {
//     component "Web Application" as WebApp
//     component "Frontend Helper" as FrontHelper
// }

// package "Backend" {
//     component "API Gateway" as APIGateway {
//         component "Authentication Service" as AuthService
//         component "Routing Service" as RoutingService
//     }

//     component "Database" as DB
// }

// WebApp --> APIGateway : Sends requests
// APIGateway --> AuthService : Validates
// APIGateway --> RoutingService : Routes
// AuthService --> DB : Reads/Writes user data
// RoutingService --> DB : Queries
// FrontHelper --> WebApp : Supports UI rendering

// @enduml
//     `;
//     return [{ name: "nested-stacked-sibling-diagram", code: plantUMLCode }];
// }

// function getPlantuml() {
//     const diagrams = [];
//     const addedOsComponents = new Set();
//     let baseline = "";

//     Object.entries(tree).forEach(([osComponent, componentData], index) => {

//         baseline = ` Baseline: ${osComponent}\\n`;

//         if (!addedOsComponents.has(osComponent) && osComponent == "linux") {

//             // let plantUMLCode = `@startuml\n  package "${osComponent} ${index}" {\n`;
//             let plantUMLCode = `@startuml\n  package "${osComponent}" {\n`;

//             /***************************************************************************** */

//             // OS Component Class Properties
//             if (componentData.version.hasOwnProperty("versionNumber")) {

//                 plantUMLCode += `    class ${osComponent.toLowerCase()} {\n`;

//                 if (componentData.version.versionReleaseChannel === 'cve') {
//                     plantUMLCode += `        Note: <b>Security Update</b>\n`;
//                 }

//                 if (isRecent(componentData.version.versionReleaseDate)) {
//                     plantUMLCode += `        Date: <b>${formatDate(componentData.version.versionReleaseDate)}</b>\n`;
//                 } else {
//                     plantUMLCode += `        Date: ${formatDate(componentData.version.versionReleaseDate)}\n`;
//                 }
//                 plantUMLCode += `      Version: ${addMajorTag(componentData.version.versionNumber)}\n`;
//                 plantUMLCode += '    }\n';
//             }

//             /***************************************************************************** */

//             // OS Sub-Component Package
//             plantUMLCode += '    package Subcomponents {\n';

//             Object.keys(componentData).forEach((component) => {

//                 if (component !== 'version') {

//                     plantUMLCode += `      class ${component} {\n`;

//                     if (isRecent(componentData[component].version.versionReleaseDate)) {
//                         plantUMLCode += `        Date: <b>${formatDate(componentData[component].version.versionReleaseDate)}</b>\n`;
//                     } else {
//                         plantUMLCode += `        Date: ${formatDate(componentData[component].version.versionReleaseDate)}\n`;
//                     }

//                     plantUMLCode += `        Version: ${addMajorTag(componentData[component].version.versionNumber)}\n`;

//                     if (componentData[component].version.versionReleaseChannel === 'cve') {
//                         plantUMLCode += `        Note: <b>Security Update</b>\n`;
//                     } else {
//                         baseline += `- ${component}\\n`;
//                     }

//                     plantUMLCode += '      }\n';

//                     plantUMLCode += '    skinparam class {\n';
//                     plantUMLCode += '    }\n';

//                 }
//             });

//             /***************************************************************************** */
//             plantUMLCode += `note  "${baseline}" as test\n`;
//             plantUMLCode += `test .- ${osComponent}\n`;            
//             plantUMLCode += '    }\n  }\n@enduml';
//             diagrams.push({ name: `diagram-${osComponent}`, code: plantUMLCode });
//             addedOsComponents.add(osComponent);
//         }
//     });
//     return diagrams;
// }

function renderDiagrams(diagrams) {
    let container = document.getElementById('plantuml-diagrams');
    let loader = document.getElementById('loader');
    loader.style.display = 'block';
    if (diagrams.length === 0) {
        let message = document.createElement('p');
        message.textContent = 'No OS components found.';
        message.classList.add('message');
        container.appendChild(message);
        loader.style.display = 'none';
    } else {
        diagrams.forEach((diagramData, index) => {
            setTimeout(() => myRender(container, diagramData), 2000 * (index + 1));
        });
    }
}

function myRender(container, diagramData) {
    let { name, code } = diagramData;
    let diagramContainer = document.createElement('div');
    diagramContainer.id = name;
    container.appendChild(diagramContainer);
    plantuml.renderPng(code)
        .then((blob) => {
            let image = document.createElement('img');
            let imageUrl = URL.createObjectURL(blob);
            image.src = imageUrl;
            image.alt = name;
            diagramContainer.appendChild(image);
            image.classList.add('diagram-image');
            loader.style.display = 'none';
        }).catch((error) => {
            console.error('Error rendering PlantUML diagram:', error);
        });
}

function formatDate(inputDate) {
    // Convert inputDate from yyyymmdd to a Date object
    const year = inputDate.slice(0, 4);
    const month = inputDate.slice(4, 6) - 1; // Months are zero-based in Date objects
    const day = inputDate.slice(6, 8);
    const dateObj = new Date(year, month, day);

    // Get current date
    const currentDate = new Date();

    // Calculate the difference in milliseconds between currentDate and inputDate
    const timeDiff = currentDate.getTime() - dateObj.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // If the difference is less than 7 days, return "Less than 7 days"
    if (daysDiff < 7) {
        return "Less than 7 days";
    }

    // Get year, month name, and day
    const yearStr = dateObj.getFullYear();
    const monthStr = new Intl.DateTimeFormat('en', { month: 'long' }).format(dateObj);
    const dayStr = dateObj.getDate();

    // Return the formatted date string
    return `${monthStr} ${dayStr}, ${yearStr}`;
}

function isRecent(inputDate) {
    // Convert inputDate from yyyymmdd to a Date object
    const year = inputDate.slice(0, 4);
    const month = inputDate.slice(4, 6) - 1; // Months are zero-based in Date objects
    const day = inputDate.slice(6, 8);
    const dateObj = new Date(year, month, day);

    // Get current date
    const currentDate = new Date();

    // Calculate the difference in milliseconds between currentDate and inputDate
    const timeDiff = currentDate.getTime() - dateObj.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // If the difference is less than 7 days, return "Less than 7 days"
    if (daysDiff < 7) {
        return true;
    }
    else {
        return false;
    }
}

function addMajorTag(version) {
    const parts = version.split('.');
    if (parts.length === 1 || (parts.length === 2 && parts[1] === '0')) {
        return version + ' <b>(major)</b>'; // It's a major version
    }
    if (parts.length === 3 && parseInt(parts[0]) > 0 && parseInt(parts[1]) === 0 && parseInt(parts[2]) === 0) {
        return version + ' <b>(major)</b>'; // It's a major version
    }
    return version;
}

function sortByDate(data) {
    function compareDates(a, b) {
        const getDateValue = (dateString) => {
            if (!dateString) return Number.MAX_SAFE_INTEGER;
            const [year, month, day] = [
                dateString.substr(0, 4),
                dateString.substr(4, 2),
                dateString.substr(6, 2)
            ];
            return new Date(year, month - 1, day).getTime();
        };
        const dateA = getDateValue(a.versionReleaseDate);
        const dateB = getDateValue(b.versionReleaseDate);
        return dateB - dateA;
    }

    return data.sort((a, b) => compareDates(a, b));
}