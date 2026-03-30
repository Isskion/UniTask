const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 50156;

const server = http.createServer((req, res) => {
    // CORS Headers for the proxy itself
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);

    // 1. Proxy Logic: /proxy?url=...
    if (parsedUrl.pathname === '/proxy') {
        const targetUrl = parsedUrl.query.url;
        if (!targetUrl) {
            res.writeHead(400);
            res.end('Missing url parameter');
            return;
        }

        console.log(`[Proxy] ${req.method} -> ${targetUrl}`);

        const targetParsed = url.parse(targetUrl);
        const options = {
            hostname: targetParsed.hostname,
            path: targetParsed.path,
            method: req.method,
            headers: { ...req.headers }
        };
        // Clean up headers for the target
        delete options.headers['host'];
        delete options.headers['origin'];
        delete options.headers['referer'];

        const proxyReq = (targetParsed.protocol === 'https:' ? https : http).request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error('Proxy Error:', err);
            res.writeHead(500);
            res.end('Proxy Error: ' + err.message);
        });

        req.pipe(proxyReq);
        return;
    }

    // 2. Static File Serving
    let filePath = '.' + parsedUrl.pathname;
    if (filePath === './') filePath = './index.html';

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 UNIGIS Integrator running at: http://localhost:${PORT}`);
    console.log(`📡 CORS Proxy active at: http://localhost:${PORT}/proxy?url=...\n`);
});
