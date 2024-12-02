import plantuml from './plantuml.js';
import util from './util.js';

// Set environment flag
const IS_PRODUCTION = true;  // Change to `true` for production

// Define URLs and paths for both environments
const config = {
    production: {
        API_ENDPOINT: "https://releasetrain.io/api",
        HOMEPAGE: "https://releasetrain.io",
        PLANTUML_PATH: "./arch"  // Path in production
    },
    development: {
        API_ENDPOINT: "https://releasetrain.io/api",
        SELECT_OS: "https://releasetrain.io/api/c/os",
        HOMEPAGE: "http://localhost:8080/src",
        PLANTUML_PATH: "./src/arch"  // Path in development
    }
};

// Set the URLs and paths based on the environment flag
const URL_API_ENDPOINT = IS_PRODUCTION ? config.production.API_ENDPOINT : config.development.API_ENDPOINT;
const urlSelectOS = IS_PRODUCTION ? "" : config.development.SELECT_OS;  // For development only
const URL_HOMEPAGE = IS_PRODUCTION ? config.production.HOMEPAGE : config.development.HOMEPAGE;
const plantumlPath = IS_PRODUCTION ? config.production.PLANTUML_PATH : config.development.PLANTUML_PATH;

// Example usage
console.log("Environment:", IS_PRODUCTION ? "PRODUCTION" : "DEVELOPMENT");
console.log("API Endpoint:", URL_API_ENDPOINT);
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

const fullQueryString = window.location.search.substring(1);

// Log the full query string
console.log("Full query string:", fullQueryString);

// Use the full query string in your AJAX request
$.ajax({
    url: `http://localhost:3000/api/v/d/versionsByComponent?${fullQueryString}`, // Pass the full query string directly
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

function handleData(data) {
    console.log("Component count", data.length, data);

    // Ensure `data` is an array
    if (!Array.isArray(data)) {
        console.error("Data is not an array");
        return;
    }

    // Iterate over each component object in the array
    data.forEach(component => {
        const { name, latestVersion, currentVersion, latestCveVersion } = component;

        // Log component details (adjust as needed)
        console.log(`Component: ${name}`);
        console.log(`Latest Version: `, latestVersion);
        console.log(`Current Version: `, currentVersion);
        console.log(`Latest CVE Version: `, latestCveVersion);

        // Here, you can process each version or add it to the global `versions` array
        versions.push({
            name,
            latestVersion,
            currentVersion,
            latestCveVersion
        });
    });

    // Initialize PlantUML for diagram generation
    plantuml.initialize(plantumlPath)
        .then(() => {
            // Generate PlantUML diagrams
            renderDiagrams(getPlantuml());
        })
        .catch((error) => {
            console.error('Error initializing PlantUML:', error);
            // Hide the loader in case of error
            hideLoader();
        });
}

function handleOsData(data) {
    if (!Array.isArray(data)) {
        console.error("Data is not an array");
    }
    // osList = data;
    osList = allowedOperatingSystems;
}

function getPlantuml() {
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

    versions.forEach((version, index) => {
        // Defensive checks for properties before accessing them
        if (!version || !version.currentVersion || !version.latestVersion) {
            console.warn(`Skipping invalid version data at index ${index}: Missing currentVersion or latestVersion`);
            return; // Skip this iteration if the version data is incomplete
        }

        // Predefined fields
        let name = sanitize(version.currentVersion.versionProductName);
        let versionNumber = sanitize(version.currentVersion.versionNumber);
        let releaseDate = sanitize(formatDateWithRelativeTime(version.currentVersion.versionReleaseDate));

        // Default CVE info as empty string
        let cveInfo = '';

        // Check if latest version and CVE info are available
        let latestVersionNumber = version.latestVersion ? sanitize(version.latestVersion.versionNumber) : null;
        let latestReleaseDate = version.latestVersion ? sanitize(formatDateWithRelativeTime(version.latestVersion.versionReleaseDate)) : null;

        if (version.latestCveVersion) {
            // Select relevant CVE details
            cveInfo = sanitize(extractCveCode(version.latestCveVersion.versionUrl)); // CVE version ID
        }

        // Defensive check for missing latestVersion details
        if (!latestVersionNumber || !latestReleaseDate) {
            console.warn(`Missing latest version data for ${name} at index ${index}.`);
        }

        // Check if current version matches the latest version
        let isSameAsLatest = (versionNumber === latestVersionNumber);

        // Increment total component count
        totalComponents++;

        // Prepare component details for PlantUML in a single line
        let componentDetails = `"${name}@${versionNumber} \\nVersion: ${versionNumber} \\nRelease Date: ${releaseDate}`;

        // if (!isSameAsLatest && latestVersionNumber && latestReleaseDate) {
            // Adding latest version and CVE info to the component details
            componentDetails += ` \\nLatest: ${name}@${latestVersionNumber} \\nVersion: ${latestVersionNumber} \\nRelease Date: ${latestReleaseDate}`;

            // Add CVE info if available
            if (cveInfo) {
                componentDetails += ` \\nCVE Info: ${cveInfo}`;
            }
        // }

        componentDetails += `"`; // End of component details string

        // Start PlantUML code for the component
        plantUMLCode += `package "${sanitize(version.name)}" {\n`;

        // Add the combined component details to the PlantUML code
        plantUMLCode += `    component ${componentDetails}\n`;

        // End the package for the current OS component
        plantUMLCode += `}\n`;
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

function renderDiagrams(diagrams) {
    console.log(diagrams);
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

            endTime = Date.now();  // Set the end time after rendering diagrams
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

// Function to replace special characters (including colon) with '-'
function sanitize(name) {
    return name.replace(/[:]/g, '-')   // Replace non-alphanumeric characters (except dot and dash) with '-'
        .replace(/\./g, '-');          // Replace periods with hyphens
}

// Extract CVE code from the full URL (e.g., CVE-2024-9194 from "https://nvd.nist.gov/vuln/detail/CVE-2024-9194")
function extractCveCode(url) {
    const regex = /CVE-\d{4}-\d+/; // Match patterns like "CVE-2024-9194"
    const match = url.match(regex);
    return match ? match[0] : null; // Return the matched CVE code or null if no match
}

function formatDateWithRelativeTime(dateStr) {
    // Parse the input date string (e.g., "20200816") into a Date object
    const date = new Date(dateStr.slice(0, 4), dateStr.slice(4, 6) - 1, dateStr.slice(6, 8));

    // Get today's date and time for comparison
    const today = new Date();

    // Calculate the difference in time
    const timeDiff = today - date;
    const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

    // Function to format the date as "Jan/30/2024"
    const formatDate = (date) => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        return `${month}/${day < 10 ? '0' + day : day}/${year}`;
    };

    // Determine the relative time to today
    let relativeTime = '';

    if (dayDiff === 0) {
        relativeTime = '(Today)';
    } else if (dayDiff === 1) {
        relativeTime = '(Yesterday)';
    } else if (dayDiff < 7) {
        relativeTime = '(This week)';
    } else if (dayDiff < 30) {
        relativeTime = '(This month)';
    }

    return `${formatDate(date)} ${relativeTime}`;
}