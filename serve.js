const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5747; // lappis -> LPIS -> 5747 (keypad)
const publicDirectory = path.join(__dirname, 'overlay-plugin/templates'); // Path to your public directory

function getMime(extname) {
    switch (extname) {
        case '.js':
            return 'text/javascript';
        case '.css':
            return 'text/css';
        case '.json':
            return 'application/json';
        case '.png':
            return 'image/png';
        case '.jpg':
            return 'image/jpg';
        default:
            return 'text/html';
    }
}

const server = http.createServer((req, res) => {
    let url = req.url;
    if (path.extname(url) === '') url += '/'; // Append trailing slash if missing
    if (url.endsWith('/')) url += 'index.html';

    let filePath = path.join(publicDirectory, url);
    let contentType = getMime(path.extname(filePath));

    // Read file
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Page not found
                res.writeHead(404);
                res.end('404 - Not Found');
            } else {
                // Server error
                res.writeHead(500);
                res.end('500 - Internal Server Error');
            }
        } else {
            // Serve the file with appropriate content type
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data, 'utf-8');
        }
    });
});

server.listen(PORT, () => console.log(`http://localhost:${PORT}/`));