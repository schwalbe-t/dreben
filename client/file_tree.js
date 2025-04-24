
function joinPaths(low, high) {
    return "/" + low.split("/").filter(s => s.length > 0).join("/")
        + "/" + high.split("/").filter(s => s.length > 0).join("/");
}

async function collectFileTree(dirPath) {
    const dirR = await fetch(`/list?dirPath=${encodeURIComponent(dirPath)}`);
    const dirL = await dirR.json();
    let dir = [];
    for(const file of dirL) {
        let f = {
            name: file.name,
            full: joinPaths(dirPath, file.name)
        };
        if(file.isDirectory) {
            f.files = await collectFileTree(f.full);
        }
        dir.push(f);
    }
    return dir;
}