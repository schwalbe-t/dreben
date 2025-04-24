
function createEmptySession() {
    return {
        projectPath: null,
        foldersOpen: {},
        panel: Panel.ProjectSelector.create()
    };
}

function createSessionFromPath(path) {
    return {
        projectPath: path,
        foldersOpen: {},
        panel: Panel.HorizontalList.create(
            Panel.FileTree.create()
        )
    };
}

let session = JSON.parse(localStorage.getItem("session"));
if(session === null) {
    session = createEmptySession();
}

function saveSession() {
    localStorage["session"] = JSON.stringify(session);
}

let configPath = null;
let config = null;
fetch("/config_path").then(r => r.text()).then(p => {
    configPath = p;
    fetch(`/read?filePath=${encodeURIComponent(configPath)}`)
        .then(r => r.text())
        .then(content => {
            config = JSON.parse(content);
            if(!windowInitialized) { return; }
            init();
        });
});

let windowInitialized = false;
window.onload = () => {
    windowInitialized = true;
    if(config === null) { return; }
    init();
};

let initialized = false;
let fileTree = null;
function init() {
    if(initialized) { return; }
    initialized = true;
    applyLayout(session);
    if(session.projectPath !== null) {
        collectFileTree(session.projectPath).then(t => {
            fileTree = t;
            applyLayout(session);
        });
    }
    setInterval(() => updateLayout(session), 100);
}