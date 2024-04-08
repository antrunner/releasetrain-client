import plantuml from '../../node_modules/@sakirtemel/plantuml.js/plantuml.js';

// PRODUCTION
/*
const URL_API_ENDPOINT = "https://releasetrain.io/api";
const urlSelectOptions = "https://releasetrain.io/api/c/names";
const URL_HOMEPAGE = "https://releasetrain.io";
*/

// DEVELOPMENT
const URL_API_ENDPOINT = "https://releasetrain.io/api";
const urlSelectOptions = "https://releasetrain.io/api/c/names";
const URL_HOMEPAGE = "http://localhost:8080/src";

let versions = [];
let tree = {};
let counterId = 0;

const urlParams = new URLSearchParams(window.location.search);
const q = urlParams.get('q') === null ? "" : urlParams.get('q');

$.ajax({
    url: `${URL_API_ENDPOINT}/v?q=${encodeURIComponent(q)}`,
    type: 'GET',
    dataType: 'json',
    success: handleData,
    error: function(jqXHR, textStatus, errorThrown) {
        console.error("Error fetching data:", textStatus, errorThrown);
    }
});

function handleData(data) {
    if (!Array.isArray(data)) {
        console.error("Data is not an array");
        return;
    }
    
    data.sort((a, b) => new Date(a.versionReleaseDate) - new Date(b.versionReleaseDate));
    versions.push(...data);
    
    versionsToTree();

    plantuml.initialize('../app/node_modules/@sakirtemel/plantuml.js')
        .then(() => {
            console.log('PlantUML initialized');
            renderDiagrams(getplantuml());
        })
        .catch((error) => {
            console.error('Error initializing PlantUML:', error);
        });
}

$('#mySelect2').select2({
    ajax: {
        url: urlSelectOptions,
        processResults: function(data) {
            counterId = 1000;
            let resultsArray = [];
            data.forEach(version => {

                if (version.hasOwnProperty('versionProductName') === false) {
                    return;
                }

                if (isFirstLetterAlphabetic(version.versionProductName) === false) {
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

function isFirstLetterAlphabetic(str) {
    if (str.length === 0) return false; // Check if the string is empty
    return /^[A-Za-z]/.test(str.charAt(0));
}

$('#mySelect2').on('change', function() {
    var selectedTexts = $(this).find(':selected').map(function() {
        return $(this).text();
    }).get();
    var valuesAsString = selectedTexts.join(',');
    var urlToCall = URL_HOMEPAGE + '/arch?q=' + valuesAsString;
    window.location.href = urlToCall;
});
   
q.split(",").forEach(component => {

    console.log(q, component);

    if (q === "") {
        return;
    }
    let initialValue = { id: counterId, text: component };
    let newOption = new Option(initialValue.text, initialValue.id, true, true);
    // $('#mySelect2').append(newOption).trigger('change');
    $('#mySelect2').append(newOption);
    counterId = counterId + 1;
})

function versionsToTree() {
    versions.forEach(v => {
        if (v.versionPredictedComponentType.toUpperCase() === "OS") {
            const osKey = `${v.versionProductName}@${v.versionNumber.replace(/\./g, ":")}`;
            if (!tree.hasOwnProperty(osKey)) {
                tree[osKey] = { version: v };
            }
        }
    });
    addLeafToTree();
}

function addLeafToTree() {
    for (const osKey in tree) {
        versions.forEach(v => {
            if (v.versionPredictedComponentType.toUpperCase() !== "OS") {
                const osComponent = osKey.split("@")[0].toLowerCase();
                if (v.versionSearchTags.includes(osComponent)) {
                    tree[osKey][`${v.versionProductName}@${v.versionNumber.replace(/\./g, ":")}`] = { version: v };
                }
            }
        });
    }
}

function getplantuml() {
    const diagrams = [];
    const addedOsComponents = new Set();

    Object.entries(tree).forEach(([osComponent, componentData], index) => {
        if (!addedOsComponents.has(osComponent)) {
            let plantUMLCode = `@startuml\n  package "${osComponent} ${index}" {\n`;

            if (componentData.version.versionReleaseChannel === 'cve') {
                plantUMLCode += '    skinparam class {\n';
                plantUMLCode += '      BackgroundColor red\n';
                plantUMLCode += '    }\n';
            }

            plantUMLCode += `    class ${osComponent.toLowerCase()} {\n`;
            plantUMLCode += `      version: ${componentData.version.versionNumber}\n`;
            plantUMLCode += '    }\n';

            plantUMLCode += '    package Subcomponents {\n';
            Object.keys(componentData).forEach((component) => {
                if (component !== 'version') {
                    plantUMLCode += `      class ${component} {\n`;
                    plantUMLCode += `        version: ${componentData[component].version.versionNumber}\n`;
                    plantUMLCode += '       ... (other details)\n';
                    plantUMLCode += '      }\n';  
                }
            });
            plantUMLCode += '    }\n  }\n@enduml';

            diagrams.push({ name: `diagram-${osComponent}`, code: plantUMLCode });
            addedOsComponents.add(osComponent);
        }
    });
    return diagrams;
}

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
    console.log('diagramData:', diagramData);
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
            image.style.width = '30%';
            image.style.margin = '10px';
            image.style.cssFloat = 'left';
            diagramContainer.appendChild(image);
            loader.style.display = 'none';
    }).catch((error) => {
        console.error('Error rendering PlantUML diagram:', error);
    });
} 
