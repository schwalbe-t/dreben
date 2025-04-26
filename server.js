
const express = require("express");
const fs = require("fs");
const os = require("os");
const path = require("path");


const PORT = 3000;


const app = express();
app.use(express.static(__dirname));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/list', (req, res) => {
    const { dirPath } = req.query;
	fs.stat(dirPath, (err, stats) => {
		if(err || !stats.isDirectory()) {
            return res.status(400).send('Invalid directory path');
        }
        fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
            if(err) {
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
    if(!filePath) {
        return res.status(400).send('File path is required');
    }
    fs.readFile(filePath, 'utf8', (err, data) => {
        if(err) {
            return res.status(500).send('Unable to read file');
        }
        res.send(data);
    });
});

app.post('/save', (req, res) => {
    const { filePath, content } = req.body;
    if(!filePath || content === undefined) {
        return res.status(400).send('File path and content are required');
    }
    fs.writeFile(filePath, content, 'utf8', (err) => {
        if(err) {
            return res.status(500).send('Unable to write to file');
        }
        res.send('File saved successfully');
    });
});

app.get('/server_path', (req, res) => {
    res.send(__dirname);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
