const { execFile } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const root = process.cwd();

function run(bin, args) {
    return new Promise((resolve, reject) => {
        execFile('node', [path.join(root, 'node_modules', bin), ...args], { cwd: root, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
            process.stdout.write(stdout);
            process.stderr.write(stderr);
            err ? reject(err) : resolve();
        });
    });
}

async function main() {
    const templates = path.join(root, 'templates');
    const out = path.join(templates, 'out');

    await run(path.join('next', 'dist', 'bin', 'next'), ['build', templates]);

    for (const name of ['404.html', '404']) {
        await fs.rm(path.join(out, name), { recursive: true }).catch(() => null);
    }

    await fs.rename(out, path.join(root, 'dist', 'templates'));
}

main().catch(e => { console.error(e); process.exit(1); });
