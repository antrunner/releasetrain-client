import plantuml from './plantuml.js';
import util from './util.js';

// Set environment flag
const IS_PRODUCTION = true;  // Change to `true` for production

// Define URLs and paths for both environments
const config = {
    production: {
        API_ENDPOINT: "https://releasetrain.io/api",
        SELECT_OPTIONS: "https://releasetrain.io/api/c/names",
        HOMEPAGE: "https://releasetrain.io",
        PLANTUML_PATH: "./arch"  // Path in production
    },
    development: {
        API_ENDPOINT: "https://releasetrain.io/api",
        SELECT_OPTIONS: "https://releasetrain.io/api/c/names",
        SELECT_OS: "https://releasetrain.io/api/c/os",
        HOMEPAGE: "http://localhost:8080/src",
        PLANTUML_PATH: "./src/arch"  // Path in development
    }
};

// Set the URLs and paths based on the environment flag
const URL_API_ENDPOINT = IS_PRODUCTION ? config.production.API_ENDPOINT : config.development.API_ENDPOINT;
const urlSelectOptions = IS_PRODUCTION ? config.production.SELECT_OPTIONS : config.development.SELECT_OPTIONS;
const urlSelectOS = IS_PRODUCTION ? "" : config.development.SELECT_OS;  // For development only
const URL_HOMEPAGE = IS_PRODUCTION ? config.production.HOMEPAGE : config.development.HOMEPAGE;
const plantumlPath = IS_PRODUCTION ? config.production.PLANTUML_PATH : config.development.PLANTUML_PATH;

// Example usage
console.log("Environment:", IS_PRODUCTION ? "PRODUCTION" : "DEVELOPMENT");
console.log("API Endpoint:", URL_API_ENDPOINT);
console.log("Select Options URL:", urlSelectOptions);
console.log("Select OS URL:", urlSelectOS);
console.log("Homepage URL:", URL_HOMEPAGE);
console.log("PlantUML Path:", plantumlPath);

// Define the top 30 operating systems
const allowedOperatingSystems = [
    "linux", "windows", "macos", "ubuntu", "centos", "debian", "redhat", "fedora", "arch", "suse",
    "mint", "mac", "solaris", "freebsd", "opensuse", "gentoo", "slackware", "manjaro", "android", "ios",
    "fedora", "android-x86", "raspbian", "kali-linux", "opensolaris", "zorin", "popos", "puppylinux", "steamos", "beaglebone"
];

let versions = [];
let osList = [];
let tree = {};
let counterId = 0;

let startTime = Date.now();  // Start time to calculate the generation time
let endTime;

const urlParams = new URLSearchParams(window.location.search);
const componentListQuery = urlParams.get('q') === null ? "" : urlParams.get('q');

$.ajax({
    url: `${URL_API_ENDPOINT}/component?q=${encodeURIComponent(componentListQuery)}`,
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
    console.log("Component count", data.length, data);

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

    plantuml.initialize(plantumlPath)
        .then(() => {
            // Call the function to generate PlantUML diagrams
            renderDiagrams(getPlantuml());
        })
        .catch((error) => {
            console.error('Error initializing PlantUML:', error);

            // Hide the loader in case of an error as well
            hideLoader();
        });

}

componentListQuery.split(",").forEach(component => {
    if (componentListQuery === "") {
        return;
    }
    counterId = counterId + 1;
})

function versionsToTree() {

    versions.forEach(v => {
        if (v.hasOwnProperty("versionPredictedComponentType") && v.versionPredictedComponentType.toUpperCase() === "OS") {
            // Process the OS component based on the allowed operating systems list
            const osKey = `${v.versionProductName}@${v.versionNumber.replace(/\./g, ":")}`;

            // Only process if the OS is in the allowed list
            const osComponent = v.versionProductName.toLowerCase();
            if (allowedOperatingSystems.includes(osComponent) && !tree.hasOwnProperty(osKey)) {
                tree[osKey] = { version: v };
            }
        } else {
            osList.forEach(os => {
                const osComponent = os.toLowerCase();
                // Check if the OS is in the allowed list before processing
                if (allowedOperatingSystems.includes(osComponent) && v.versionSearchTags.map(tag => tag.toLowerCase()).includes(os.toLowerCase())) {
                    const osKey = `${os}`;

                    // Only add the OS key if it doesn't already exist in the tree
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
    // Loop through the tree object
    for (const osKey in tree) {
        // Extract the osComponent from osKey
        const osComponent = osKey.split("@")[0].toLowerCase();

        // Iterate over the versions
        versions.forEach(v => {
            if (v.hasOwnProperty("versionPredictedComponentType") && v.versionPredictedComponentType.toUpperCase() !== "OS") {
                // Only add version if the osKey matches the operating system component
                if (v.versionSearchTags.includes(osComponent)) {
                    tree[osKey][`${v.versionProductName}@${v.versionNumber.replace(/\./g, ":")}`] = { version: v };
                }
            }
        });
    }
}
function getPlantuml() {
    console.log(componentListQuery);

    // Set to track unique OS components
    const addedOsComponents = new Set();

    // Aggregated metrics variables
    let totalComponents = 0;
    let versionDistribution = {};  // To store counts of each version
    let recentUpdateTimestamp = null;  // To track the most recent update

    const timestamp = new Date().toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
        timeZoneName: 'short'
    });

    let plantUMLCode = `
@startuml
title "Unique Operating Systems Components\\n${timestamp}"
`;

    // Function to replace special characters (including colon) with '-'
    function sanitize(name) {
        return name.replace(/[^\w\s\.-:]/g, '-');  // Replace non-alphanumeric characters (except dot and dash) with '-'
    }

    // Function to replace ':' with '-'
    function replaceColonWithDash(str) {
        return str.replace(/:/g, '-');  // Replace all colons with '-'
    }

    // Loop through each OS component in the tree
    Object.entries(tree).forEach(([osComponent, componentData], index) => {
        // Extract and normalize the OS name
        let componentName = osComponent.split('@')[0].toLowerCase();
        componentName = sanitize(componentName);  // Sanitize the component name

        // Skip already added components
        if (!addedOsComponents.has(componentName)) {
            addedOsComponents.add(componentName);
            totalComponents++;  // Increment total component count

            // Start a package for the OS component
            plantUMLCode += `package "${componentName}" {\n`;

            // Add OS version info inside the component's name, replacing ':' with '-'
            if (componentData.version && componentData.version.versionNumber) {
                let version = replaceColonWithDash(componentData.version.versionNumber);  // Replace ':' with '-'
                let releaseDate = formatDate(componentData.version.versionReleaseDate);  // Get release date (no need for sanitization here)

                // Aggregating version distribution
                versionDistribution[version] = (versionDistribution[version] || 0) + 1;

                // Track recent update timestamp
                let versionReleaseDate = new Date(componentData.version.versionReleaseDate);
                if (!recentUpdateTimestamp || versionReleaseDate > recentUpdateTimestamp) {
                    recentUpdateTimestamp = versionReleaseDate;
                }

                plantUMLCode += `    component "${componentName}@${version}\\nVersion: ${version}\\nRelease Date: ${releaseDate}"\n`;
            }

            if (componentData && componentData.version) {
                // Loop through the components, excluding 'version' itself
                Object.keys(componentData).forEach((component) => {
                    if (component !== 'version') {
                        // Sanitize the component name
                        component = sanitize(component);

                        // Get the subcomponent data
                        let subComponent = componentData[component];

                        // Safely handle undefined version and release date
                        let subVersion = subComponent?.version?.versionNumber
                            ? replaceColonWithDash(subComponent.version.versionNumber)
                            : 'N/A';  // Replace ':' with '-' or return 'N/A' if undefined

                        let subReleaseDate = subComponent?.version?.versionReleaseDate
                            ? formatDate(subComponent.version.versionReleaseDate)
                            : 'N/A';  // Return 'N/A' if undefined

                        // Add the component with version and release date to the PlantUML code
                        plantUMLCode += `    component "${component}\\nVersion: ${subVersion}\\nRelease Date: ${subReleaseDate}"\n`;
                    }
                });
            }

            // End the package for the current OS component
            plantUMLCode += `}\n`;
        }
    });

    plantUMLCode += `
@enduml
`;

    // Insert the PlantUML code into the HTML element with the id "plantuml-code"
    document.getElementById("plantuml-code").innerText = plantUMLCode;

    // Update the metrics section on the page
    document.getElementById("totalComponents").textContent = totalComponents;
    document.getElementById("versionDistribution").textContent = JSON.stringify(versionDistribution, null, 2);
    document.getElementById("recentUpdate").textContent = recentUpdateTimestamp ? recentUpdateTimestamp.toLocaleString() : 'N/A';

    // Aggregate and log critical data
    console.log(`Total Components: ${totalComponents}`);
    console.log(`Version Distribution: ${JSON.stringify(versionDistribution)}`);
    console.log(`Most Recent Update: ${recentUpdateTimestamp ? recentUpdateTimestamp.toLocaleString() : 'N/A'}`);

    // Optionally return the generated PlantUML code
    return [{ name: "unique-os-packages", code: plantUMLCode }];
}

// function getPlantuml() {

//     console.log(componentListQuery);

//     const addedOsComponents = new Set(); // Keep track of unique OS packages
//     let plantUMLCode = `
// @startuml
// title "Unique Operating Systems Packages"
// `;

//     Object.entries(tree).forEach(([osComponent]) => {
//         // Extract the OS name before '@' and ensure it's unique
//         let componentName = osComponent.split('@')[0];
//         componentName = componentName.toLowerCase();
//         componentName = componentName.replace(".", "_");

//         if (!addedOsComponents.has(componentName)) {
//             addedOsComponents.add(componentName);
//             plantUMLCode += `
// package "${componentName}" {
// }
//             `;
//         }
//     });

//     plantUMLCode += `
// @enduml
//     `;

//     // Insert the PlantUML code into the HTML element with the id "plantuml-code"
//     document.getElementById("plantuml-code").innerText = plantUMLCode;

//     // Optionally return the generated PlantUML code
//     return [{ name: "unique-os-packages", code: plantUMLCode }];
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

            const endTime = Date.now();  // Set the end time after rendering diagrams
            const generationTime = ((endTime - startTime) / 1000).toFixed(2).trim();  // Calculate the generation time in seconds

            // Update the metrics section on the page with the generation time
            document.getElementById("generationTime").textContent = generationTime;

            // Hide the loader and stop the timer after the image is generated
            hideLoader();
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