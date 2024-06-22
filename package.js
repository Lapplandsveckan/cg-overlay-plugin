const { exec } = require('child_process');
const fss = require('fs');
const fs = fss.promises;
const path = require('path');
const root = __dirname;

function cmd(command, ...args) {
    let cmdPath = JSON.stringify(path.join(root, 'node_modules', command));
    cmdPath += args.map(arg => ` ${arg}`).join('');

    return new Promise((resolve, reject) => {
        exec(`node ${cmdPath}`, (error, stdout, stderr) => {
            if (error) {
                console.error(stdout);
                console.error(stderr);
                reject(error);
                return;
            }

            resolve(stdout ? stdout : stderr);
        });
    });
}

async function readDirRecursive(dir) {
    const results = await fs.readdir(dir);
    const files = [];

    for (const result of results) {
        if (result.endsWith('.js')) files.push(result);
        if (result.includes('.')) continue;

        const subFiles = await readDirRecursive(path.join(dir, result));
        for (const subFile of subFiles) files.push(`${result}/${subFile}`);
    }

    return files;
}

async function packageSource() {
    console.log('Compiling plugin source...');
    await cmd(path.join('webpack-cli', 'bin', 'cli'));
    await fs.rm(path.join(root, 'dist', 'index.js.LICENSE.txt'));
}

async function packageUI() {
    console.log('Packaging UI...');

    const ui = path.join(root, 'ui');
    const out = path.join(root, 'dist', 'ui');

    await fs.cp(ui, out, { recursive: true });
}

async function packageTemplates() {
    console.log('Packaging templates...');

    const templates = path.join(root, 'templates');
    const out = path.join(root, 'templates', 'out');
    const dest = path.join(root, 'dist', 'templates');

    await cmd(path.join('next', 'dist', 'bin', 'next'), 'build', JSON.stringify(templates));

    const exclude = ['404.html', '404'];
    for (const ex of exclude) {
        const p = path.join(out, ex);
        await fs.rm(p, { recursive: true });
    }

    await fs.rename(out, dest);
}

async function package() {
    await packageSource();
    await packageUI();
    await packageTemplates();

    console.log('Packaging plugin...');
    await fs.rm(path.join(root, 'overlay-plugin'), { recursive: true }).catch(() => null);
    await fs.rename(path.join(root, 'dist'), path.join(root, 'overlay-plugin'));
}

async function movePlugin() {
    let dest = process.env.DEST;
    if (!dest) return;

    console.log('Moving plugin...');

    if (dest.endsWith('/') || dest.endsWith('\\')) dest += 'overlay-plugin';

    const src = path.join(root, 'overlay-plugin');
    await fs.rm(dest, { recursive: true }).catch(() => null);
    await fs.cp(src, dest, { recursive: true });

    console.log(`Plugin moved to ${dest}`);
}

async function finalize() {
    console.log('Finalizing...');
    await movePlugin();
}

async function clean() {
    console.log('Cleaning up...');
}

async function main() {
    let state = true;
    await package().catch((e) => (state = false) || console.error(e));
    await finalize();
    await clean();

    if (state) console.log('Build complete!');
    else console.error('Build failed!');
}

main().catch(console.error);