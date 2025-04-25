
function loadAll(tasks, callback) {
    let loaded = new Array(tasks.length).fill(false);
    const allLoaded = () => loaded.indexOf(false) === -1;
    for(const taskI in tasks) {
        tasks[taskI](() => {
            loaded[taskI] = true;
            if(allLoaded()) { callback(); }
        });
    }
}