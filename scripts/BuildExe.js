// Packages build/src/index.js into a single standalone .exe using Node's own
// Single Executable Applications (SEA) feature, instead of the unmaintained `nexe`
// package (which has no prebuilt binaries past ~Node 14/15 and would have shipped an
// end-of-life Node runtime that crashes on the newer fs APIs this codebase uses).
//
// Steps (see https://nodejs.org/api/single-executable-applications.html):
//   1. Bundle build/src/index.js and all its dependencies into one CommonJS file.
//   2. Ask Node to generate a "blob" from that bundle, per sea-config.json.
//   3. Copy the currently running `node` binary to the output .exe path.
//   4. (Windows, best-effort) Strip the code signature from the copy, since node.exe
//      ships signed and injecting content into a signed binary invalidates the signature
//      anyway — removing it first avoids a corrupt-looking signature on the result.
//   5. Inject the blob into the copied binary with `postject`.
const {execFileSync} = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const bundlePath = path.join(repoRoot, "build", "bundle.js");
const blobPath = path.join(repoRoot, "build", "sea-prep.blob");
const seaConfigPath = path.join(repoRoot, "sea-config.json");
const outputExePath = path.join(repoRoot, "build", "MongoDataMigration.exe");

// Optional dependencies the mongodb driver only `require()`s inside try/catch blocks
// when the caller has installed them (e.g. for AWS/Kerberos auth or snappy/zstd
// compression). They aren't installed here, so esbuild must leave those calls alone
// instead of trying to resolve them at bundle time.
const mongodbOptionalDeps = ["bson-ext", "kerberos", "@mongodb-js/zstd", "snappy", "mongodb-client-encryption", "aws4"];

function run(command, args) {
	console.log(`> ${command} ${args.join(" ")}`);

	execFileSync(command, args, {stdio: "inherit"});
}

function bundle() {
	fs.mkdirSync(path.dirname(bundlePath), {recursive: true});

	run(process.execPath, [
		path.join(repoRoot, "node_modules", "esbuild", "bin", "esbuild"),
		path.join(repoRoot, "build", "src", "index.js"),
		"--bundle",
		"--platform=node",
		"--format=cjs",
		`--outfile=${bundlePath}`,
		...mongodbOptionalDeps.map(dep => `--external:${dep}`),
	]);
}

function generateBlob() {
	if (fs.existsSync(blobPath)) {
		fs.rmSync(blobPath);
	}

	run(process.execPath, ["--experimental-sea-config", seaConfigPath]);
}

function copyNodeBinary() {
	fs.mkdirSync(path.dirname(outputExePath), {recursive: true});

	fs.copyFileSync(process.execPath, outputExePath);
}

function removeWindowsSignatureIfPossible() {
	if (process.platform !== "win32") {
		return;
	}

	try {
		run("signtool", ["remove", "/s", outputExePath]);
	} catch {
		// signtool isn't installed, or the binary wasn't signed to begin with — injection
		// still works either way, so this step is best-effort only.
		console.log("signtool not available or nothing to remove; continuing without it.");
	}
}

function injectBlob() {
	run(process.execPath, [
		path.join(repoRoot, "node_modules", "postject", "dist", "cli.js"),
		outputExePath,
		"NODE_SEA_BLOB",
		blobPath,
		"--sentinel-fuse",
		"NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
		"--overwrite",
	]);
}

bundle();
generateBlob();
copyNodeBinary();
removeWindowsSignatureIfPossible();
injectBlob();

console.log(`\nBuilt ${outputExePath} (embeds Node ${process.version}).`);
