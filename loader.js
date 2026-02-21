// loader.js - This loads everything in the right order
console.log("Loader starting...");

// Wait for faceapi to be ready
function waitForFaceAPI() {
    return new Promise((resolve) => {
        if (typeof faceapi !== 'undefined') {
            resolve();
        } else {
            setTimeout(() => {
                waitForFaceAPI().then(resolve);
            }, 100);
        }
    });
}

// Load all scripts in order
async function loadApp() {
    console.log("Waiting for faceapi...");
    await waitForFaceAPI();
    console.log("faceapi loaded, now loading main app...");
    
    // Now load main.js as a module
    const module = await import('./main.js');
    console.log("Main app loaded successfully!");
}

loadApp().catch(err => {
    console.error("Error loading app:", err);
    document.getElementById('modelStatus').innerText = "❌ Failed to load app";
});