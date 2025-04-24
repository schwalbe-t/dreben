# dreben
A simple web-based editor based on Express.js and Monaco.

### Server endpoints

Running:
```
node server.js
```
will launch a server for hosting the editor in the current directory with the following endpoints and configurations:
```js
// change these at the top of 'server.js' to modify them 
const PORT = 3000;
const BASE_DIR = "/home/schwalbe_t/"
```
- `GET /list` - Returns a list of all files in the given directory
	- `dirPath` - The path (relative to `BASE_DIR`, defaults to `.`) of the directory to list
	- Returns a JSON array containing JSON objects of structure `{ name: "...", isDirectory: true/false }`

- `GET /read` - Returns the contents of the file at the given file path
	- `filePath` - The path (relative to `BASE_DIR`) of the file to read
	- Returns the contents of the file

- `POST /save` - Writes the given contents to a file at the given file path
	- `filePath` - The path (relative to `BASE_DIR`) of the file to write to
	- `content` - The contents of the file to write
