const fs = require('fs');
const path = require('path');

fs.cpSync(path.resolve(__dirname, 'src', 'ui'), path.resolve(__dirname, 'dist', 'ui'), { recursive: true });
fs.cpSync(path.resolve(__dirname, 'src', 'templates'), path.resolve(__dirname, 'dist', 'templates'), { recursive: true });