# dreben
A simple web-based editor based on Express.js and Monaco.

For ways to customize the editor, have a look at https://microsoft.github.io/monaco-editor/docs.html#interfaces/editor.IStandaloneEditorConstructionOptions.html (can be put into the `editors` member of `config.json`)

### Dependencies
```
npm install path-browserify onigasm monaco-editor monaco-textmate monaco-editor-textmate
npm install --save-dev webpack webpack-cli
npx webpack
```