import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 5747; // lappis -> LPIS -> 5747 (keypad)
const publicDirectory = path.join(__dirname, 'templates'); // Path to your public directory

function getMime(extname: string): string {
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

export class Templates {
    private server: any;

    constructor(onListen: () => void) {
        const server = http.createServer((req, res) => {
            let url = req.url;
            if (path.extname(url) === '') url += '/'; // Append trailing slash if missing
            if (url.endsWith('/')) url += 'index.html';

            const filePath = path.join(publicDirectory, url);
            const contentType = getMime(path.extname(filePath));

            // Read file
            fs.readFile(filePath, (err, data) => {
                if (!err) {
                    // Serve the file with appropriate content type
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(data, 'utf-8');
                    return;
                }

                if (err.code === 'ENOENT') {
                    // Page not found
                    res.writeHead(404);
                    res.end('404 - Not Found');
                    return;
                }

                // Server error
                res.writeHead(500);
                res.end('500 - Internal Server Error');
            });
        });

        server.listen(PORT, () => onListen());
    }

    getFilePath(file: string) {
        return `http://localhost:${PORT}/${file}`;
    }

    dispose() {
        this.server.close();
        this.server = null;
    }
}