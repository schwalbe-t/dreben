# dreben
A simple web-based editor based on Express.js and Monaco.

For ways to customize the editor, have a look at https://microsoft.github.io/monaco-editor/docs.html#interfaces/editor.IStandaloneEditorConstructionOptions.html (can be put into the `editors` member of `config.json`)

### Running
```
npm install --production
node server.js
```

### Customization
In `config.json`, the following can be customized:
- `editor` - A JSON object containing the arguments to be passed to Monaco
- `themePath` - The file name of a JSON VS Code theme file in the `themes` directory.
- `fileExtensions` - A JSON object mapping file extensions to the language ID
- `tmGrammars` - A JSON object mapping language IDs to language grammars, where each grammar object has:
    - `scope` - The scope of the grammar tokens as specified in the grammar file
    - `grammar` - An object with a `format` (either `"plist"` or `"json"`) and a `file` (name of the grammar file in the `grammars` directory)
    - `config` - A JSON object containing language configuration passed to Monaco

### Adding VS Code Color Themes
Simply take the `.json` theme file (in VS Code extensions often in the `themes`-subdirectory) and drag it into the `themes`-directory. Change the `themePath` in `config.json` to be the name of that file and reload your browser tab.

### Adding VS Code Language Grammars
1. Copy the `.tmlanguage` grammar file (in VS Code extensions often in the `syntaxes`-subdirectory) and drag it into the `grammars`-directory
2. Map all file extensions of that language to its ID (e.g. `"js": "javascript"`) by adding them to the `fileExtensions`-object in the `config.json`
3. Add an entry for that language in the `tmGrammars`-object in the `config.json` (the name of the entry being the language ID):
    - `scope` - Often located near the top of the language grammar file
    - `grammar` - An object with a `format` (either `"plist"` or `"json"`) and a `file` (name of the grammar file in the `grammars` directory)
    - `config` - A JSON object containing language configuration passed to Monaco, this object is often in a file called something like `language-configuration.json` in the main folder of the VS Code extension

### Dependencies
To bundle dependencies using webpack, run the following: 
```
npm install
npx webpack
```