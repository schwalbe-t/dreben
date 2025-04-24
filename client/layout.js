
require.config({ paths: { vs: '/node_modules/monaco-editor/min/vs' } });

function normalizeListChildren(children) {
    let oldTotalSize = 0.0;
    for(const child of children) {
        oldTotalSize += child.size;
    }
    for(const child of children) {
        child.size = child.size / oldTotalSize;
    }
}

function replaceListChildren(panel) {
    if(panel.children.length === 1) { 
        const p = panel.children[0].panel;
        return Panel[p.id].replace(p);
    }
    for(const i in panel.children) {
        const p = panel.children[i].panel;
        panel.children[i].panel = Panel[p.id].replace(p);
    }
    return panel;
}

let draggedPanel = null;

function makePanelDraggable(elem, f) {
    elem.draggable = true;
    elem.addEventListener("dragstart", e => {
        draggedPanel = f;
        e.dataTransfer.effectAllowed = 'move';
    });
    elem.addEventListener("dragend", () => {
        draggedPanel = null;
    });
}

let openEditors = {};

const Panel = Object.freeze({

    VerticalList: {
        create: (...children) => { return {
            id: "VerticalList",
            children: children.map(c => { return {
                panel: c,
                size: 1.0 / children.length
            }; })
        }; },
        title: null,
        build: (panel, e, session) => {
            normalizeListChildren(panel.children);
            e.classList.add("container", "vertcontainer");
            const children = panel.children.map(c => {
                const p = buildPanel(c.panel, session, panel);
                p.style.flexGrow = `${c.size}`;
                return p;
            });
            for(const i in children) {
                if(i >= 1) { 
                    e.appendChild(buildDivider(
                        true, e, panel.children, children, i - 1
                    )); 
                }
                e.appendChild(children[i]);
            }
        },
        replace: replaceListChildren,
        update: panel => panel.children.forEach(
            c => Panel[c.panel.id].update(c.panel)
        ),
        close: p => {}
    },

    HorizontalList: {
        create: (...children) => { return {
            id: "HorizontalList",
            children: children.map(c => { return {
                panel: c,
                size: 1.0 / children.length
            }; })
        }; },
        title: null,
        build: (panel, e, session) => {
            normalizeListChildren(panel.children);
            e.classList.add("container", "horizcontainer");
            const children = panel.children.map(c => {
                const p = buildPanel(c.panel, session, panel);
                p.style.flexGrow = `${c.size}`;
                return p;
            });
            for(const i in children) {
                if(i >= 1) { 
                    e.appendChild(buildDivider(
                        false, e, panel.children, children, i - 1
                    ));  
                }
                e.appendChild(children[i]);
            }
        },
        replace: replaceListChildren,
        update: panel => panel.children.forEach(
            c => Panel[c.panel.id].update(c.panel)
        ),
        close: p => {}
    },

    ProjectSelector: {
        create: () => { return {
            id: "ProjectSelector"
        }; },
        title: panel => "Project Selection",
        build: (panel, e) => {
            const p = document.createElement("p");
            p.innerText = "Enter the full path of the project directory:";
            e.appendChild(p);
            const i = document.createElement("input");
            i.placeholder = "Full project directory";
            i.style.width = "50%";
            e.appendChild(i);
            const c = document.createElement("button");
            c.innerText = "Confirm";
            c.onclick = () => {
                collectFileTree(i.value).then(t => {
                    fileTree = t;
                    session = createSessionFromPath(i.value);
                    applyLayout(session);
                    saveSession();
                });
            };
            e.appendChild(c);
        },
        replace: p => p,
        update: p => {},
        close: p => {}
    },

    FileTree: {
        create: () => { return {
            id: "FileTree"
        }; },
        title: null,
        build: (panel, e) => {
            const dirToElem = dir => {
                dir.sort((a, b) => {
                    const isADir = a.files !== undefined;
                    const isBDir = b.files !== undefined;
                    if(isADir && !isBDir) { return -1; }
                    if(!isADir && isBDir) { return 1; }
                    return a.name.localeCompare(b.name);
                });
                const d = document.createElement("ul");
                for(const file of dir) {
                    const isDir = file.files !== undefined;
                    const f = document.createElement("li");
                    const n = document.createElement("span");
                    n.innerText = file.name;
                    n.classList.add("filetree-item",
                        isDir? "filetree-folder" : "filetree-file"
                    );
                    f.appendChild(n);
                    if(isDir) {
                        const c = dirToElem(file.files);
                        const opened = session.foldersOpen[file.full];
                        c.hidden = opened === undefined? true : !opened;
                        n.innerText = `📁 ${file.name}`;
                        n.onclick = () => {
                            c.hidden = !c.hidden;
                            session.foldersOpen[file.full] = !c.hidden;
                            n.innerText 
                                = `${c.hidden? '📁' : '📂'} ${file.name}`;
                            saveSession();
                        };
                        f.appendChild(c);
                    } else {
                        makePanelDraggable(
                            n, () => Panel.Editor.create(file.full)
                        );
                    }
                    d.appendChild(f);
                }
                return d;
            };
            if(fileTree === null) {
                const msg = document.createElement("p");
                msg.innerText = "Indexing project...";
                e.appendChild(msg);
                return;
            }
            e.appendChild(dirToElem(fileTree));
            const config = document.createElement("div");
            config.innerText = "config.json";
            config.classList.add("filetree-config");
            makePanelDraggable(config, () => Panel.Editor.create(configPath));
            e.appendChild(config);
        },
        replace: p => p,
        update: p => {},
        close: p => {}
    },

    Editor: {
        create: (path) => { return {
            id: "Editor",
            path
        }; },
        title: panel => panel.path,
        build: (panel, e, session, title) => {
            require(['vs/editor/editor.main'], function() {
                let editor = openEditors[panel.path];
                if(editor === undefined) {
                    const ext = panel.path.split(".").at(-1);
                    const element = document.createElement("div");
                    element.style.width = "100%";
                    element.style.height = "100%";
                    const params = JSON.parse(JSON.stringify(config.editor));
                    params.value = "Loading file...";
                    params.language = config.fileExtensions[ext];
                    editor = {
                        element, 
                        editor: monaco.editor.create(element, params),
                        content: "",
                        title
                    };
                    editor.editor.onDidChangeModelContent(() => {
                        editor.content = editor.editor.getValue();
                        editor.title.innerText = `${panel.path}*`;
                    });
                    document.addEventListener('keydown', e => {
                        if((e.ctrlKey || e.metaKey) && e.key === 's') {
                            e.preventDefault();
                            if(!editor.editor.hasTextFocus()) { return; }
                            const fd = new FormData();
                            fd.append("filePath", panel.path);
                            fd.append("content", editor.content);
                            fetch("/save", {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    filePath: panel.path,
                                    content: editor.content
                                })
                            }).then(r => {
                                if(r.ok) {
                                    editor.title.innerText = `${panel.path}`;
                                }
                            })
                        }
                    });
                    fetch(`/read?filePath=${encodeURIComponent(panel.path)}`)
                        .then(r => r.text())
                        .then(content => {
                            editor.content = content;
                            editor.editor.setValue(content);
                            editor.title.innerText = `${panel.path}`;
                        });
                }
                editor.title = title;
                openEditors[panel.path] = editor;
                e.appendChild(editor.element);
            });
        },
        replace: p => p,
        update: p => {
            const editor = openEditors[p.path];
            if(editor === undefined) { return; }
            editor.editor.layout();
        },
        close: p => {
            const editor = openEditors[p.path];
            if(editor === undefined) { return; }
            editor.editor.dispose();
            delete openEditors[p.path];
        }
    }

});

function buildDivider(isVertical, container, panels, elems, prevIdx) {
    const d = document.createElement("div");
    d.classList.add("divider", isVertical? "vertdivider" : "horizdivider");
    let dragging = false;
    d.addEventListener("mousedown", () => {
        dragging = true;
        document.body.style.cursor = isVertical? "row-resize" : "col-resize";
    });
    document.addEventListener("mousemove", e => {
        if(!dragging) { return; }
        const contBounds = container.getBoundingClientRect();
        const contSize = isVertical
            ? contBounds.bottom - contBounds.top
            : contBounds.right - contBounds.left;
        const prevBounds = elems[prevIdx].getBoundingClientRect();
        let offset = isVertical
            ? e.clientY - prevBounds.bottom
            : e.clientX - prevBounds.right;
        offset /= contSize;
        let prevPanel = panels[prevIdx];
        if(offset < -prevPanel.size) { offset = -prevPanel.size; }
        let nextPanel = panels[prevIdx + 1];
        if(offset > nextPanel.size) { offset = nextPanel.size; }
        prevPanel.size += offset;
        elems[prevIdx].style.flexGrow = `${prevPanel.size}`;
        nextPanel.size -= offset;
        elems[prevIdx + 1].style.flexGrow = `${nextPanel.size}`;
        saveSession();
    });
    document.addEventListener("mouseup", () => {
        if(!dragging) { return; }
        dragging = false;
        document.body.style.cursor = "default";
    });
    return d;
}

function buildPanel(panel, session, parentPanel = null) {
    const panelType = Panel[panel.id];
    const p = document.createElement("div");
    p.classList.add("panel");
    let t;
    if(panelType.title !== null) {
        const h = document.createElement("div");
        h.classList.add("panel-header-bar");
        t = document.createElement("div");
        t.classList.add("panel-header-title");
        t.innerText = panelType.title(panel);
        h.appendChild(t);
        if(parentPanel !== null) {
            const c = document.createElement("button");
            c.classList.add("panel-header-close");
            c.innerText = "X";
            c.onclick = () => {
                const i = parentPanel.children
                    .findIndex(c => c.panel === panel);
                parentPanel.children.splice(i, 1);
                Panel[panel.id].close(panel);
                applyLayout(session);
                saveSession();
            };
            h.appendChild(c);
        }
        p.appendChild(h);
    }
    const c = document.createElement("div");
    c.classList.add("panel-content");
    panelType.build(panel, c, session, t);
    p.appendChild(c);
    p.addEventListener("dragover", e => {
        e.preventDefault();
    });
    p.addEventListener("drop", e => {
        if(draggedPanel === null) { return; }
        e.preventDefault();
        const bounds = p.getBoundingClientRect();
        const normX = (e.clientX - bounds.left) / (bounds.right - bounds.left);
        const normY = (e.clientY - bounds.top) / (bounds.bottom - bounds.top);
        const normCDX = Math.abs(0.5 - normX);
        const normCDY = Math.abs(0.5 - normY);
        let newPanel;
        if(normCDX < 0.25 && normCDY < 0.25) {
            newPanel = draggedPanel();
            Panel[panel.id].close(panel);
        } else {
            newPanel = (normCDX > normCDY)
                ? Panel.HorizontalList.create(panel, draggedPanel())
                : Panel.VerticalList.create(panel, draggedPanel());
        }
        if(parentPanel !== null) {
            const i = parentPanel.children
                .findIndex(c => c.panel === panel);
            parentPanel.children[i].panel = newPanel;
        } else {
            session.panel = newPanel;
        }
        draggedPanel = null;
        applyLayout(session);
        saveSession();
    });
    return p;
}

function applyLayout(session) {
    session.panel = Panel[session.panel.id].replace(session.panel);
    document.body.innerHTML = "";
    document.body.appendChild(buildPanel(session.panel, session));
}

function updateLayout(session) {
    Panel[session.panel.id].update(session.panel);
}