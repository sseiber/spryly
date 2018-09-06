const path = require('path');
const rimraf = require('rimraf');
const child_process = require('child_process');
const os = require('os');
const is_windows = os.type().toUpperCase() === "WINDOWS_NT";

const is_hook = (process.argv.length >= 2) && process.argv.indexOf("--hook") >= 2;
if (is_hook) {
    console.log("Hook mode");
}

const root = path.resolve(__dirname, '..');
const outFolder = path.resolve(root, is_hook ? "dist_hook" : "dist");

console.log(`Output target: ${outFolder}`)
console.log(`Building on: ${os.type()}`);
console.log('Removing dist folder');
rimraf.sync(outFolder);

const typescript_path = path.resolve(root, "node_modules", ".bin", is_windows ? "tsc.cmd" : "tsc");
const tsconfig_path = path.resolve(root, "tsconfig.json");

let build_failed = false;

console.log("Building project with declarations...");
try {
    const ts_args = ["-p", tsconfig_path, "--declaration"];

    if (is_hook) {
        ts_args.push("--outDir", outFolder);
    }

    console.log(`Typescript: ${typescript_path}`);
    console.log(`Typescript args: ${ts_args.join(" ")}`);
    console.log(`TSConfig: ${tsconfig_path}`);
    console.log(`--------------------------------------------------------------------`);
    console.log(``);
    child_process.execFileSync(typescript_path, ts_args, { stdio: [0, 1, 2] });
}
catch (e) {
    build_failed = true;
}
finally {
    if(!build_failed) {
        console.log(`All good!`)
    }
    console.log(``);
    console.log(`--------------------------------------------------------------------`);
    if (is_hook) {
        console.log("Removing hook build folder")
        rimraf.sync(outFolder);
    }
}

if (build_failed) {
    console.log("Build project failed, see errors above");
    process.exit(-1);
}

console.log("Build completed");

if (!is_hook) {
    console.log("Removing tests");
    rimraf.sync(path.resolve(outFolder, "test"));
}
