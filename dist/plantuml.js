// Define the module with exportable functionality
const plantuml = {
    async initialize(cheerpjPath = "./src") {
        try {
            cheerpjPath = cheerpjPath.replace(/\/+$/, "");
            
            await Promise.all([
                cheerpjInit({ preloadResources: this._runtimeResources() }),
                this._preloadPlantumlFiles(cheerpjPath)
            ]);
            console.log(`${cheerpjPath}plantuml-core.jar`);
            

            // Load the Java package necessary for PlantUML
            await cheerpjRunMain("com.plantuml.wasm.v1.RunInit", `${cheerpjPath}/plantuml-core.jar`, `${cheerpjPath}`);
        } catch (error) {
            console.error('Initialization failed:', error);
            throw error; // Rethrow or handle as needed
        }
    },

    renderPng(pumlContent) {
        return new Promise((resolve, reject) => {
            const renderingStartedAt = new Date();
            const resultFileSuffix = renderingStartedAt.getTime().toString();

            cjCall("com.plantuml.wasm.v1.Png", "convert", "light", `/files/result-${resultFileSuffix}.png`, pumlContent).then((result) => {
                try {
                    const obj = JSON.parse(result);
                    if (obj.status === 'ok') {
                        cjFileBlob(`result-${resultFileSuffix}.png`).then((blob) => {
                            const transaction = cheerpjGetFSMountForPath('/files/').dbConnection.transaction('files', 'readwrite');
                            transaction.objectStore('files').delete(`/result-${resultFileSuffix}.png`);

                            transaction.oncomplete = () => {
                                console.log('Rendering finished in', (new Date()).getTime() - renderingStartedAt.getTime(), 'ms');
                                resolve(blob);
                            };
                        });
                    } else {
                        throw new Error('Rendering failed with status: ' + obj.status);
                    }
                } catch (e) {
                    console.error('Failed to render PNG:', e);
                    reject(e);
                }
            });
        });
    },

    _runtimeResources() {
        return [/* list of runtime resources paths */];
    },

    _preloadPlantumlFiles(urlBasePathForFiles) {
        try {
            console.log("Original path:", urlBasePathForFiles);
            let cleanPath = urlBasePathForFiles.replace(/\/+$/, "");
            console.log("Fetching files from:", cleanPath);
            return Promise.all([
                fetch(`${cleanPath}/plantuml-core.jar.js`),
                fetch(`${cleanPath}/plantuml-core.jar`)
            ]);
        } catch (error) {
            console.error('Failed to preload PlantUML files:', error);
            throw error;
        }
    }
};

export default plantuml;