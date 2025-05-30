
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

function closeListChildren(panel) {
    panel.children = panel.children.filter(c => {
        const panelType = Panel[c.panel.id];
        if(!panelType.shouldClose(c.panel)) { return true; }
        panelType.close(c.panel);
        return false;
    });
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

let openFiles = {};

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
            closeListChildren(panel);
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
        shouldClose: p => p.children.length === 0,
        close: p => {},
        allowDragReplacement: false,
        allowManualClosing: false,
        showDropPreview: false
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
            closeListChildren(panel);
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
        shouldClose: p => p.children.length === 0,
        close: p => {},
        allowDragReplacement: false,
        allowManualClosing: false,
        showDropPreview: false
    },

    ProjectSelector: {
        create: () => { return {
            id: "ProjectSelector"
        }; },
        title: panel => "Project Selection",
        build: (panel, e) => {
            const container = document.createElement("div");
            container.classList.add("project-selector-container");
            const prompt = document.createElement("p");
            prompt.classList.add("project-selector-prompt");
            prompt.innerText = "Project Directory";
            container.appendChild(prompt);
            const info = document.createElement("p");
            info.innerText = 'Provide the full path of the project directory, e.g. "/home/some_user/my_project"';
            container.appendChild(info);
            const input = document.createElement("input");
            input.placeholder = "Full project directory";
            input.style.width = "50%";
            container.appendChild(input);
            const confirm = document.createElement("button");
            confirm.innerText = "Confirm";
            confirm.onclick = () => {
                const selected = input.value;
                collectFileTree(selected).then(t => {
                    fileTree = t;
                    session = createSessionFromPath(selected);
                    applyLayout(session);
                    saveSession();
                });
            };
            container.appendChild(confirm);
            e.appendChild(container);
        },
        replace: p => p,
        update: p => {},
        shouldClose: p => false,
        close: p => {},
        allowDragReplacement: false,
        allowManualClosing: false,
        showDropPreview: false
    },

    FileTree: {
        create: () => { return {
            id: "FileTree"
        }; },
        title: panel => {
            const name = session.projectPath.split("/").filter(s => s).at(-1);
            return `Files (${name})`;
        },
        build: (panel, e) => {
            const c = document.createElement("div");
            c.classList.add("filetree-container");
            e.appendChild(c);
            const l = document.createElement("div");
            l.classList.add("filetree-file-list");
            c.appendChild(l);
            const dirToElem = (dir, indent = 0) => {
                dir.sort((a, b) => {
                    const isADir = a.files !== undefined;
                    const isBDir = b.files !== undefined;
                    if(isADir && !isBDir) { return -1; }
                    if(!isADir && isBDir) { return 1; }
                    return a.name.localeCompare(b.name);
                });
                const d = document.createElement("div");
                for(const file of dir) {
                    const isDir = file.files !== undefined;
                    const f = document.createElement("div");
                    const fc = document.createElement("div");
                    fc.classList.add("filetree-file-container");
                    f.appendChild(fc);
                    const ic = document.createElement("div");
                    ic.classList.add("filetree-item-container");
                    ic.classList.add(
                        isDir? "filetree-folder" : "filetree-file"
                    );
                    ic.style.setProperty('--indent', indent);
                    if(isDir) {
                        const i = document.createElement("img");
                        i.classList.add("filetree-item-icon");
                        const setFolderIcon = open => {
                            i.src = "client/icons/" + (open
                                ? "arrow_drop_down.svg" : "arrow_right.svg"
                            );
                        };
                        ic.appendChild(i);
                        const c = dirToElem(file.files, indent + 1);
                        let opened = session.foldersOpen[file.full];
                        if(opened === undefined) { opened = false; }
                        c.hidden = !opened;
                        setFolderIcon(opened);
                        fc.onclick = () => {
                            opened = !opened;
                            c.hidden = !opened;
                            session.foldersOpen[file.full] = opened;
                            setFolderIcon(opened);
                            saveSession();
                        };
                        f.appendChild(c);
                    } else {
                        const i = document.createElement("div");
                        i.classList.add("filetree-item-icon");
                        ic.appendChild(i);
                        makePanelDraggable(
                            fc, () => Panel.Editor.create(file.full)
                        );
                    }
                    const nc = document.createElement("div");
                    nc.classList.add("filetree-name-container");
                    const n = document.createElement("div");
                    n.classList.add("filetree-name");
                    n.innerText = file.name;
                    nc.appendChild(n);
                    ic.appendChild(nc);
                    fc.appendChild(ic);
                    d.appendChild(f);
                }
                return d;
            };
            if(fileTree === null) {
                const msg = document.createElement("p");
                msg.innerText = "Indexing project...";
                l.appendChild(msg);
                return;
            }
            l.appendChild(dirToElem(fileTree));
            const footer = document.createElement("div");
            footer.classList.add("filetree-footer");
            const config = document.createElement("div");
            config.innerText = "config.json";
            config.classList.add("filetree-config");
            makePanelDraggable(config, () => Panel.Editor.create(configPath));
            footer.appendChild(config);
            const exit = document.createElement("div");
            exit.innerText = "Open Another Project";
            exit.classList.add("filetree-exit");
            exit.onclick = () => {
                session = createEmptySession();
                applyLayout(session);
            };
            footer.appendChild(exit);
            c.appendChild(footer);
        },
        replace: p => p,
        update: p => {},
        shouldClose: p => false,
        close: p => {},
        allowDragReplacement: false,
        allowManualClosing: false,
        showDropPreview: true
    },

    Editor: {
        create: (path) => { return {
            id: "Editor",
            path
        }; },
        title: panel => panel.path,
        build: (panel, e, session, title) => {
            let file = openFiles[panel.path];
            if(file === undefined) {
                const ext = panel.path.split(".").at(-1);
                file = {
                    model: monaco.editor.createModel(
                        "Loading file...",
                        config.fileExtensions[ext]
                    ),
                    editors: new Map()
                };
                openFiles[panel.path] = file;
                fetch(`/read?filePath=${encodeURIComponent(panel.path)}`)
                    .then(r => r.text())
                    .then(content => {
                        file.model.setValue(content);
                        for(const [editorPanel, editor] of file.editors) {
                            editor.title.innerText = `${editorPanel.path}`;
                        }
                    });
            }
            let editor = file.editors.get(panel);
            if(editor === undefined) {
                const element = document.createElement("div");
                element.style.width = "100%";
                element.style.height = "100%";
                const params = JSON.parse(JSON.stringify(config.editor));
                params.model = file.model;
                editor = {
                    element,
                    editor: monaco.editor.create(element, params),
                    title
                };
                MonacoEditorTextmate.wireTmGrammars(
                    monaco, grammarRegistry, tmGrammarScopes, editor.editor
                );
                file.editors.set(panel, editor);
                editor.editor.onDidChangeModelContent(() => {
                    editor.title.innerText = `${panel.path} ⬤`;
                });
                document.addEventListener('keydown', e => {
                    if((e.ctrlKey || e.metaKey) && e.key === 's') {
                        e.preventDefault();
                        if(!editor.editor.hasTextFocus()) { return; }
                        fetch("/save", {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                filePath: panel.path,
                                content: file.model.getValue()
                            })
                        }).then(r => {
                            if(!r.ok) { return; }
                            for(const [editorPanel, editor] of file.editors) {
                                editor.title.innerText = `${editorPanel.path}`;
                            }
                        })
                    }
                });
            }
            editor.title = title;
            e.appendChild(editor.element);
        },
        replace: p => p,
        update: p => {
            const file = openFiles[p.path];
            const editor = file.editors.get(p);
            if(editor === undefined) { return; }
            editor.editor.layout();
        },
        shouldClose: p => false,
        close: p => {
            const file = openFiles[p.path];
            const editor = file.editors.get(p);
            if(editor === undefined) { return; }
            editor.editor.dispose();
            file.editors.delete(p);
            if(file.editors.size === 0) {
                delete openFiles[p.path];
            }
        },
        allowDragReplacement: true,
        allowManualClosing: true,
        showDropPreview: true
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

const DROP_PREVIEW_CLASSES = [
    "preview-full", 
    "preview-left", "preview-right", "preview-top", "preview-bottom"
];

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
            const detachPanel = () => {
                const i = parentPanel.children
                    .findIndex(c => c.panel === panel);
                parentPanel.children.splice(i, 1);
            };
            if(panelType.allowManualClosing) {
                const c = document.createElement("img");
                c.classList.add("panel-header-close");
                c.src = "client/icons/close.svg";
                c.onclick = () => {
                    detachPanel();
                    Panel[panel.id].close(panel);
                    applyLayout(session);
                    saveSession();
                };
                h.appendChild(c);
            }
            makePanelDraggable(h, replaces => {
                if(replaces === panel) { return null; }
                detachPanel();
                return panel;
            });
        }
        p.appendChild(h);
    }
    const c = document.createElement("div");
    c.classList.add("panel-content");
    panelType.build(panel, c, session, t);
    p.appendChild(c);
    const prev = document.createElement("div");
    prev.classList.add("panel-drop-preview");
    p.appendChild(prev);
    p.addEventListener("dragover", e => {
        e.preventDefault();
        if(!panelType.showDropPreview) { return; }
        const bounds = p.getBoundingClientRect();
        const normX = (e.clientX - bounds.left) / (bounds.right - bounds.left);
        const normY = (e.clientY - bounds.top) / (bounds.bottom - bounds.top);
        const normCX = normX - 0.5;
        const normCY = normY - 0.5;
        const isFull = Math.abs(normCX) < 0.25 && Math.abs(normCY) < 0.25 
            && panelType.allowDragReplacement;
        const previewClass = isFull
            ? "preview-full" 
            : (Math.abs(normCX) > Math.abs(normCY))
                ? (normCX < 0? "preview-left" : "preview-right")
                : (normCY < 0? "preview-top" : "preview-bottom");
        prev.classList.remove(...DROP_PREVIEW_CLASSES);
        prev.classList.add(previewClass);
    });
    p.addEventListener("dragleave", () => {
        prev.classList.remove(...DROP_PREVIEW_CLASSES);
    });
    p.addEventListener("drop", e => {
        if(draggedPanel === null) { return; }
        e.preventDefault();
        const cleanup = () => {
            draggedPanel = null;
            prev.classList.remove(...DROP_PREVIEW_CLASSES);  
        };
        const bounds = p.getBoundingClientRect();
        const normX = (e.clientX - bounds.left) / (bounds.right - bounds.left);
        const normY = (e.clientY - bounds.top) / (bounds.bottom - bounds.top);
        const normCX = normX - 0.5;
        const normCY = normY - 0.5;
        let newPanel;
        const isFull = Math.abs(normCX) < 0.25 && Math.abs(normCY) < 0.25 
            && panelType.allowDragReplacement;
        if(isFull) {
            newPanel = draggedPanel(panel);
            if(newPanel === null) { return cleanup(); }
            panelType.close(panel);
        } else {
            const added = draggedPanel();
            if(added === null) { return cleanup(); }
            newPanel = (Math.abs(normCX) > Math.abs(normCY))
                ? normCX >= 0
                    ? Panel.HorizontalList.create(panel, added)
                    : Panel.HorizontalList.create(added, panel)
                : normCY >= 0
                    ? Panel.VerticalList.create(panel, added)
                    : Panel.VerticalList.create(added, panel);
        }
        if(parentPanel !== null) {
            const i = parentPanel.children
                .findIndex(c => c.panel === panel);
            parentPanel.children[i].panel = newPanel;
        } else {
            session.panel = newPanel;
        }
        cleanup();
        applyLayout(session);
        saveSession();
    });
    return p;
}

function applyLayout(session) {
    session.panel = Panel[session.panel.id].replace(session.panel);
    document.body.innerHTML = "";
    document.body.appendChild(buildPanel(session.panel, session));
    document.title 
        = `Dreben | ${session.projectPath.split("/").filter(s => s).at(-1)}`;
}

function updateLayout(session) {
    Panel[session.panel.id].update(session.panel);
}