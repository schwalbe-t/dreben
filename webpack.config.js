
const path = require('path')

module.exports = {
    entry: './deps_bundle.js',
    output: {
        filename: 'deps.js',
        path: path.resolve(__dirname, 'dist')
    },
    mode: 'production',
    resolve: {
        fallback: {
            path: require.resolve('path-browserify')
        }
    }    
};
