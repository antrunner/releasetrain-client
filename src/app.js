import plantuml from './plantuml.js';

// Set environment flag
const IS_PRODUCTION = true;  // Change to `false` for development

// Define URLs and paths for both environments
const config = {
    production: {
        API_ENDPOINT: "https://releasetrain.io/api",
        HOMEPAGE: "https://releasetrain.io",
        PLANTUML_PATH: "./"  // Path in production
    },
    development: {
        API_ENDPOINT: "https://releasetrain.io/api",
        //API_ENDPOINT: "http://localhost:3000/api",
        SELECT_OS: "https://releasetrain.io/api/c/os",
        HOMEPAGE: "http://localhost:8080/",
        PLANTUML_PATH: "./src"  // Path in development
    }
};

// Set the URLs and paths based on the environment flag
const URL_API_ENDPOINT = IS_PRODUCTION ? config.production.API_ENDPOINT : config.development.API_ENDPOINT;
const urlSelectOS = IS_PRODUCTION ? "" : config.development.SELECT_OS;
const URL_HOMEPAGE = IS_PRODUCTION ? config.production.HOMEPAGE : config.development.HOMEPAGE;
const plantumlPath = IS_PRODUCTION ? config.production.PLANTUML_PATH : config.development.PLANTUML_PATH;

console.log("Environment:", IS_PRODUCTION ? "PRODUCTION" : "DEVELOPMENT");
console.log("API Endpoint:", URL_API_ENDPOINT);
console.log("Select OS URL:", urlSelectOS);
console.log("Homepage URL:", URL_HOMEPAGE);
console.log("PlantUML Path:", plantumlPath);

// Define valid stacks for query processing
const check_stack = ["lamp", "lemp", "unn", "rails", "dws", "flask", "spring", "crp", "dds", "usp"];
const stack_dict = {
    "lamp": "component=name:apache&component=name:linux&component=name:mysql&component=name:php",
    "lemp": "component=name:nginx&component=name:mysql&component=name:php&component=name:linux",
    "unn": "component=name:ubuntu&component=name:nginx&component=name:nodejs",
    "rails": "component=name:macos&component=name:rails&component=name:postgresql",
    "dws": "component=name:django&component=name:windows&component=name:sqlite",
    "flask": "component=name:flask&component=name:arch&component=name:postgresql",
    "spring": "component=name:redhat&component=name:spring&component=name:java",
    "crp": "component=name:centos&component=name:rails&component=name:postgresql",
    "dds": "component=name:debian&component=name:django&component=name:sqlite",
    "usp": "component=name:ubuntu&component=name:prisma&component=name:svelte"
};

let versions = [];

// Get query parameters
const urlParams = new URLSearchParams(window.location.search);
const queryValue = urlParams.get("q");

// Stop execution if `q` is missing or empty
if (!queryValue) {
    console.log("Query parameter 'q' is missing or empty. Stopping script execution.");
} else {
    console.log("Query parameter 'q' detected:", queryValue);

    // Process the query string
    let fullQueryString = `q=${queryValue}`;
    if (check_stack.includes(queryValue)) {
        fullQueryString = stack_dict[queryValue];
    } else {
        fullQueryString = `component=name:${queryValue}`;
    }

    console.log("Processed Query String:", fullQueryString);

    // Fetch data using the processed query
    $.ajax({
        url: `${URL_API_ENDPOINT}/v/d/versionsByComponent?${fullQueryString}`,
        type: 'GET',
        dataType: 'json',
        success: handleData,
        error: function (jqXHR, textStatus, errorThrown) {
            console.error("Error fetching data:", textStatus, errorThrown);
        }
    });
}

function sortVersionsByOperatingSystem(versions) {
    if (!Array.isArray(versions) || versions.length === 0) {
        console.warn("Invalid or empty versions array.");
        return versions;
    }

    return versions.sort((a, b) => {
        const isAOS = allowedOperatingSystems.includes(a.name?.toLowerCase());
        const isBOS = allowedOperatingSystems.includes(b.name?.toLowerCase());
        return isBOS - isAOS; // Move OS objects to the top
    });
}

// Function to replace special characters (including colon) with '-'
function sanitize(name) {
    return name.replace(/[:]/g, '-')   // Replace non-alphanumeric characters (except dot and dash) with '-'
        .replace(/\./g, '-');          // Replace periods with hyphens
}


// Function to group components by stack
function getStack(getComponent) {
    // console.log("Components received:", getComponent);

    // Ensure `getComponent` is an array
    if (!Array.isArray(getComponent) || getComponent.length === 0) {
        // console.warn("getComponent is empty or not an array.");
        return { groupedStacks: [], extraComponents: [] };
    }

    const stacks = [
        { name: "LAMP", components: ["apache", "mysql", "php", "linux"] },
        { name: "LEMP", components: ["nginx", "mysql", "php", "linux"] },
        { name: "UNN", components: ["ubuntu", "nginx", "nodejs"] },
        { name: "RAILS", components: ["macos", "rails", "postgresql"] },
        { name: "DWS", components: ["django", "windows", "sqlite"] },
        { name: "FLASK", components: ["flask", "arch", "postgresql"] },
        { name: "SPRING", components: ["redhat", "spring", "java"] },
        { name: "CRP", components: ["centos", "rails", "postgresql"] },
        { name: "DDS", components: ["debian", "django", "sqlite"] },
        { name: "USP", components: ["ubuntu", "prisma", "svelte"] }
    ];

    const groupedStacks = [];
    const usedComponents = new Set();

    for (const stack of stacks) {
        // Strict match: All stack components must be in getComponent
        const isStrictMatch = stack.components.every(component => getComponent.includes(component.toLowerCase()));

        if (isStrictMatch) {
            groupedStacks.push({ stackName: stack.name, matchedComponents: stack.components });
            stack.components.forEach(component => usedComponents.add(component.toLowerCase())); // Mark components as used
        }
    }

    // Identify extra or unmatched components
    const extraComponents = getComponent
        .filter(component => !usedComponents.has(component.toLowerCase()))
        .map(component => ({ component, belongsToStack: false }));
    return { groupedStacks, extraComponents };
}

function extractCveCode(url) {
    if (!url) {
        return "Unknown CVE"; // Return a generic placeholder if the URL is undefined or null
    }

    const regex = /CVE-\d{4}-\d+/; // Match patterns like "CVE-2024-9194"
    const match = url.match(regex);

    return match ? match[0] : "Generic Security Issue"; // Return matched CVE code or a generic fallback
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

// Function to handle API response
function handleData(data) {
    console.log("Component count:", data.length, data);

    if (!Array.isArray(data)) {
        console.error("Data is not an array");
        return;
    }

    data.forEach(component => {
        const { name, latestVersion, currentVersion, latestCveVersion } = component;

        if (latestVersion) latestVersion.versionNumber = latestVersion.versionNumber.replace(/\./g, ':');
        if (currentVersion) currentVersion.versionNumber = currentVersion.versionNumber.replace(/\./g, ':');
        if (latestCveVersion) latestCveVersion.versionNumber = latestCveVersion.versionNumber.replace(/\./g, ':');

        console.log(`Component: ${name}`);
        console.log(`Latest Version:`, latestVersion);
        console.log(`Current Version:`, currentVersion);
        console.log(`Latest CVE Version:`, latestCveVersion);

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
            renderDiagrams(getPlantuml());
        })
        .catch((error) => {
            console.error('Error initializing PlantUML:', error);
            hideLoader();
        });
}

// Function to get PlantUML diagram data
function getPlantuml() {
    // Aggregated metrics variables
    let totalComponents = 0;

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

    let plantUMLCode = `@startuml\ntitle "${timestamp}"\n`;

    // Fetch and sort version details
    versions = sortVersionsByOperatingSystem(versions);

    plantUMLCode += `package "${sanitize(versions[0].name)} OS" {\n`;

    // Extract component names from versions
    const getComponent = versions.map(version => version.name);

    // Group components by stack
    const { groupedStacks, extraComponents } = getStack(getComponent);
    //console.log("Grouped Stacks (Strict Matching):", groupedStacks);
    console.log("Extra Components:", extraComponents);
    totalComponents = versions.length;
    //console.log("Total Components:", totalComponents);

    // Function to generate component details
    function generateComponentDetails(version) {
        //console.log('Version:', version);   
        version.currentVersion = version.currentVersion || version.latestVersion;
        if (!version || !version.currentVersion || !version.latestVersion) {
            //console.warn(`Skipping invalid version data: Missing currentVersion or latestVersion`);
            return null; // Skip this iteration if the version data is incomplete
        }
        let name = sanitize(version.currentVersion.versionProductName);
        let versionNumber = sanitize(version.currentVersion.versionNumber);
        let releaseDate = sanitize(formatDateWithRelativeTime(version.currentVersion.versionReleaseDate));
        let cveInfo = version.latestCveVersion ? sanitize(extractCveCode(version.latestCveVersion.versionUrl)) : '';
        let latestVersionNumber = version.latestVersion ? sanitize(version.latestVersion.versionNumber) : null;
        let latestReleaseDate = version.latestVersion ? sanitize(formatDateWithRelativeTime(version.latestVersion.versionReleaseDate)) : null;

        let componentDetails = `"${name}@${versionNumber} \\nVersion: ${versionNumber} \\nRelease Date: ${releaseDate}`;

        if (latestVersionNumber && latestReleaseDate) {
            componentDetails += ` \\nLatest: ${name}@${latestVersionNumber} \\nVersion: ${latestVersionNumber} \\nRelease date: ${latestReleaseDate}`;
        }

        if (cveInfo) {
            componentDetails += ` \\nCVE Info: ${cveInfo}`;
        }

        componentDetails += `"`; // End of component details string

        return componentDetails;
    }

    // Function to add OS package
    function addOSPackage(osName, components) {

        components.forEach(component => {
            plantUMLCode += `package "${component.name}" {\n`;
            plantUMLCode += `    component ${generateComponentDetails(component)}\n`;
            plantUMLCode += `}\n`;
        });

    }

    // Function to add stack package
    function addStackPackage(stackName, components) {
        plantUMLCode += `package "${stackName} stack" {\n`;
        const osComponents = {};

        components.forEach(component => {
            const osName = component.name; // Assuming the OS name is the same as the component name
            if (!osComponents[osName]) {
                osComponents[osName] = [];
            }
            osComponents[osName].push(component);
        });

        for (const osName in osComponents) {
            addOSPackage(osName, osComponents[osName]);
        }
    }

    // if there are no grouped stacks just push the extra components
    if (groupedStacks.length === 0) {
        addOSPackage("Extra Components", versions);
    }
    else {
        // Process grouped stacks
        groupedStacks.forEach(stack => {
            const stackComponents = versions.filter(version => stack.matchedComponents.includes(version.name));
            //console.log("Stack Components:", stackComponents);
            addStackPackage(stack.stackName, stackComponents);
        });
        // end the stack
        plantUMLCode += `}\n`;
        // Process extra components
        const extraComponentVersions = versions.filter(version => extraComponents.some(extra => extra.component === version.name));

        addOSPackage("Extra Components", extraComponentVersions);
    }

    plantUMLCode += `}\n@enduml\n`;
    console.log("PlantUML Code:", plantUMLCode);
    // Insert the PlantUML code into the HTML element with the id "plantuml-code"
    //document.getElementById("plantuml-code").innerHTML = formatPlantUML(plantUMLCode);

    // Update the metrics section on the page
    //document.getElementById("totalComponents").textContent = totalComponents;

    // Optionally return the generated PlantUML code
    return [{ name: "unique-os-packages", code: plantUMLCode }];
}

// Function to render diagrams
function renderDiagrams(diagrams) {
    let container = document.getElementById('plantuml-diagrams');
    diagrams.forEach((diagramData, index) => {
        setTimeout(() => myRender(container, diagramData), 2000 * (index + 1));
    });
}

// Function to render images from PlantUML
function myRender(container, diagramData) {
    let { name, code } = diagramData;

    let canvas = document.getElementById('plantuml-diagrams');
    if (!canvas) return;

    let ctx = canvas.getContext('2d');
    if (!ctx) return;

    plantuml.renderPng(code)
        .then((blob) => {
            let imageUrl = URL.createObjectURL(blob);
            let image = new Image();

            image.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Calculate scaling to maintain aspect ratio
                let scale = Math.min(canvas.width / image.width, canvas.height / image.height);
                let scaledWidth = image.width * scale;
                let scaledHeight = image.height * scale;

                // If the scaled height is too large, constrain it to the canvas height
                if (scaledHeight > canvas.height) {
                    scaledHeight = canvas.height;
                    scaledWidth = (image.width / image.height) * scaledHeight;
                }

                // Center the image
                let offsetX = (canvas.width - scaledWidth) / 2;
                let offsetY = (canvas.height - scaledHeight) / 2;

                // Draw image with rounded borders
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(offsetX, offsetY, scaledWidth, scaledHeight, 5); // Adjust radius as needed
                ctx.clip();
                ctx.drawImage(image, offsetX, offsetY, scaledWidth, scaledHeight);
                ctx.restore();
            };

            image.src = imageUrl;
        })
        .catch((error) => console.error('Error rendering PlantUML:', error));
}