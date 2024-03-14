import plantuml from '../../node_modules/@sakirtemel/plantuml.js/plantuml.js';
import versions from './versions.js';

let tree = {};

function versionsToTree() {
    versions.forEach(v => {
        if (v.versionPredictedComponentType.toUpperCase() === "OS") {
            if (!tree.hasOwnProperty(v.versionProductName)) {
                tree[v.versionProductName  + "@" + v.versionNumber.replace(/\./g, ":")] = {
                    version: v,
                };
            }
        }
    });
}

function addLeafToTree() {
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

versionsToTree();
addLeafToTree();

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