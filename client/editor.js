
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

let serverPath = null;
let configPath = null;
let config = null;
let tmGrammarScopes = new Map();
let grammarRegistry = new MonacoTextmate.Registry({
    getGrammarDefinition: async (scopeName) => {
        for(const lang in config.tmGrammars) {
            const entry = config.tmGrammars[lang];
            if(entry.scope !== scopeName) { continue; }
            const path = joinPaths(serverPath, joinPaths("grammars", entry.file));
            const r = await fetch(`/read?filePath=${encodeURIComponent(path)}`);
            const text = await r.text();
            return {
                format: entry.format,
                content: text
            };
        }
        throw `Unknown language scope '${scopeName}'`;
    }
});
function loadConfig(onDone) {
    fetch("/server_path").then(r => r.text()).then(p => {
        serverPath = p;
        configPath = joinPaths(p, "config.json");
        fetch(`/read?filePath=${encodeURIComponent(configPath)}`)
            .then(r => r.text())
            .then(content => {
                config = JSON.parse(content);
                loadTheme(onDone);
            });
    });
}

let themeData = null;
function loadTheme(onDone) {
    const themePath = joinPaths(joinPaths(serverPath, "themes"), config.themePath);
    require(['vs/editor/editor.main'], () => {
        fetch(`/read?filePath=${encodeURIComponent(themePath)}`)
            .then(r => r.text())
            .then(content => {
                themeData = JSON.parse(content);
                monaco.editor.defineTheme('customtheme', themeData);
                monaco.editor.setTheme('customtheme');
                document.documentElement.style.setProperty(
                    '--editor-background', 
                    themeData.colors["editor.background"]
                );
                document.documentElement.style.setProperty(
                    '--select-background', 
                    themeData.colors["editor.selectionBackground"]
                );
                document.documentElement.style.setProperty(
                    '--editor-text',
                    themeData.colors["editor.foreground"]
                );
                for(const lang in config.tmGrammars) {
                    monaco.languages.register({ id: lang });
                    tmGrammarScopes.set(lang, config.tmGrammars[lang].scope);
                }
                onDone();
            });
    });
}

function loadWindow(onDone) {
    window.onload = () => onDone();
}

function loadOnigasm(onDone) {
    Onigasm.loadWASM("/node_modules/onigasm/lib/onigasm.wasm").then(onDone);
}

let fileTree = null;
loadAll([ loadConfig, loadWindow, loadOnigasm ], () => {
    applyLayout(session);
    if(session.projectPath !== null) {
        collectFileTree(session.projectPath).then(t => {
            fileTree = t;
            applyLayout(session);
        });
    }
    setInterval(() => updateLayout(session), 100);
});