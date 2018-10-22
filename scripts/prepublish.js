// tslint:disable:no-console
const path = require('path');
const rimraf = require('rimraf');
const childProcess = require('child_process');
const os = require('os');
const isWindows = os.type().toUpperCase() === 'WINDOWS_NT';

const isHook = (process.argv.length >= 2) && process.argv.indexOf('--hook') >= 2;
if (isHook) {
    console.log('Hook mode');
}

const root = path.resolve(__dirname, '..');
const outFolder = path.resolve(root, isHook ? 'dist_hook' : 'dist');

console.log(`Output target: ${outFolder}`);
console.log(`Building on: ${os.type()}`);
console.log('Removing dist folder');
rimraf.sync(outFolder);

const tsCommand = path.resolve(root, 'node_modules', '.bin', isWindows ? 'tsc.cmd' : 'tsc');
const tsConfig = path.resolve(root, 'tsconfig.json');

let buildFailed = false;

console.log('Building project with declarations...');
try {
    const tsArgs = ['-p', tsConfig, '--declaration'];

    if (isHook) {
        tsArgs.push('--outDir', outFolder);
    }

    console.log(`Typescript: ${tsCommand}`);
    console.log(`Typescript args: ${tsArgs.join(' ')}`);
    console.log(`TSConfig: ${tsConfig}`);
    console.log(`--------------------------------------------------------------------`);
    console.log(``);
    childProcess.execFileSync(tsCommand, tsArgs, { stdio: [0, 1, 2] });
} catch (e) {
    buildFailed = true;
} finally {
    if (!buildFailed) {
        console.log(`All good!`);
    }
    console.log(``);
    console.log(`--------------------------------------------------------------------`);
    if (isHook) {
        console.log('Removing hook build folder');
        rimraf.sync(outFolder);
    }
}

if (buildFailed) {
    console.log('Build project failed, see errors above');
    process.exit(-1);
}

console.log('Build completed');

if (!isHook) {
    console.log('Removing tests');
    rimraf.sync(path.resolve(outFolder, 'test'));
}
// tslint:enable:no-console
