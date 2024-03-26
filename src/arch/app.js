    import plantuml from '../../node_modules/@sakirtemel/plantuml.js/plantuml.js';
    // import versions from './versions.js';

    let versions = [];
    let tree = {};
    const URL_API_ENDPOINT = "https://releasetrain.io/api";
    const URL_HOMEPAGE = "https://releasetrain.io";
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q') === null ? "" : urlParams.get('q');
    let urlSelectOptions = URL_API_ENDPOINT + '/c/names';
    let counterId = 0;

    q.split(",").forEach(component => {
    if (q === "") {
        return;
    }
    let initialValue = { id: counterId, text: component };
    let newOption = new Option(initialValue.text, initialValue.id, true, true);
    counterId = counterId + 1;
    })

    $.ajax({
        url: URL_API_ENDPOINT + "/v?q=" + encodeURIComponent(q), // Ensure query is URL encoded
        type: 'GET',
        dataType: 'json',
        success: function(data) {
            if (!Array.isArray(data)) {
                console.error("Data is not an array");
                return;
            }

            const sortedData = data.sort((a, b) => {
                return new Date(a.versionReleaseDate) - new Date(b.versionReleaseDate);
            });

            versions = sortedData;
            versionsToTree(versions);

            plantuml.initialize('../app/node_modules/@sakirtemel/plantuml.js').then(() => {
            //plantuml.initialize().then(() => {
            console.log('init...');
            let container = document.getElementById('plantuml-diagrams');
            let diagrams = getplantuml();
            diagrams.forEach((diagramData, index) => {
            setTimeout(myRender, 2000 * (index + 1), container, diagramData);
            });
            }).catch((error) => {
            console.error('Error initializing PlantUML:', error);
            });

        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("Error fetching data:", textStatus, errorThrown);
        }
    });

    function versionsToTree() {
        versions.forEach(v => {
        console.log("versionsToTree",v.versionPredictedComponentType.toUpperCase());
        if (v.versionPredictedComponentType.toUpperCase() === "OS") {
        if (!tree.hasOwnProperty(v.versionProductName)) {
            tree[v.versionProductName  + "@" + v.versionNumber.replace(/\./g, ":")] = {
                version: v,
            };
        }
        }
        });
        addLeafToTree();
    }

    function addLeafToTree() {
                console.log("addLeafToTree",tree);
        for (let os in tree) {
        versions.forEach(v => {
        if (v.versionPredictedComponentType.toUpperCase() !== "OS") {
            if (v.versionSearchTags.includes(os.split("@")[0].toLowerCase())) {
                tree[os][v.versionProductName + "@" + v.versionNumber.replace(/\./g, ":")] = { version: v };
            }
        }
        });
        }
    }

    function getplantuml() {
    const diagrams = [];
    const addedOsComponents = new Set(); // Keep track of added osComponents
    let index = 0;
    Object.entries(tree).forEach(([osComponent, componentData]) => {
    if (!addedOsComponents.has(osComponent)) { // Check if osComponent has not been added
    let plantUMLCode = '@startuml\n';
    plantUMLCode += `  package "${osComponent} ${index}" {\n`;

     // Check if the versionReleaseChannel is cve, if so, set color to red
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
        plantUMLCode += '    }\n';  // end of Subcomponents

        plantUMLCode += '  }\n';  // end of package
        plantUMLCode += '@enduml';
        diagrams.push({ name: `diagram-${osComponent}`, code: plantUMLCode });
        addedOsComponents.add(osComponent); // Add osComponent to the Set to mark it as added
        index++;
    }

    });
    return diagrams;
    }

    function myRender(container, diagramData) {
    console.log('diagramData:', diagramData);
    let { name, code } = diagramData;
    let diagramContainer = document.createElement('div');
    diagramContainer.id = name; 
    container.appendChild(diagramContainer); 
    plantuml.renderPng(code).then((blob) => {
    let image = document.createElement('img');
    let imageUrl = URL.createObjectURL(blob);
    image.src = imageUrl;
    image.alt = name;
    diagramContainer.appendChild(image);
    }).catch((error) => {
    console.error('Error rendering PlantUML diagram:', error);
    });
    } 