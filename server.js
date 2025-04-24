
const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 3000;
const BASE_DIR = "/home/schwalbe_t/"

app.use(express.static(__dirname));
app.use(express.json());

app.get('/list', (req, res) => {
    const dirPath = req.query.dirPath ? path.join(BASE_DIR, req.query.dirPath) : BASE_DIR;
	fs.stat(dirPath, (err, stats) => {
		if (err || !stats.isDirectory()) {
            return res.status(400).send('Invalid directory path');
        }

        fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
            if (err) {
                return res.status(500).send('Unable to scan directory');
            }
			const fileInfo = files.map(file => ({
                name: file.name,
                isDirectory: file.isDirectory()
            }));
            res.json(fileInfo);
        });
    });
});

app.get('/read', (req, res) => {
    const { filePath } = req.query;
    if (!filePath) {
        return res.status(400).send('File path is required');
    }    
    const fullPath = path.join(BASE_DIR, filePath);
    fs.readFile(fullPath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Unable to read file');
        }
        res.send(data);
    });
});

app.post('/save', (req, res) => {
    const { filePath, content } = req.body;
    if (!filePath || content === undefined) {
        return res.status(400).send('File path and content are required');
    }
    const fullPath = path.join(BASE_DIR, filePath);
    fs.writeFile(fullPath, content, 'utf8', (err) => {
        if (err) {
            return res.status(500).send('Unable to write to file');
        }
        res.send('File saved successfully');
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
