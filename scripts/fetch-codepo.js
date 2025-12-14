import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASET_PAGE_URL =
  'https://www.data.gov.uk/dataset/c1e0176d-59fb-4a8c-92c9-c8b376a80687/code-point-open2';
const OS_DIRECT_DOWNLOAD_URL =
  'https://api.os.uk/downloads/v1/products/CodePointOpen/downloads?area=GB&format=CSV&redirect';

const REPO_ROOT = path.join(__dirname, '..');
const DEFAULT_TARGET_DIR = path.join(REPO_ROOT, 'codepo_gb');
const DEFAULT_TMP_DIR = path.join(REPO_ROOT, 'tmp');

function hasCsvDir(dir) {
  return fs.existsSync(path.join(dir, 'Data', 'CSV'));
}

function parseArgs(argv) {
  const args = {
    url: process.env.CODEPO_ZIP_URL || null,
    targetDir: process.env.CODEPO_DIR ? path.resolve(process.env.CODEPO_DIR) : DEFAULT_TARGET_DIR,
    tmpDir: process.env.CODEPO_TMP_DIR ? path.resolve(process.env.CODEPO_TMP_DIR) : DEFAULT_TMP_DIR,
    force: false,
    noExtract: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--force') args.force = true;
    else if (token === '--no-extract') args.noExtract = true;
    else if (token === '--url') args.url = argv[++i] ?? null;
    else if (token === '--dir') args.targetDir = path.resolve(argv[++i] ?? '');
    else if (token === '--tmp') args.tmpDir = path.resolve(argv[++i] ?? '');
    else if (token === '--help' || token === '-h') {
      console.log(`
Downloads Ordnance Survey Code-Point Open and places it in ./codepo_gb for building postcodes.

Usage:
  npm run fetch:codepo -- [--url <zipUrl>] [--dir <targetDir>] [--tmp <tmpDir>] [--force] [--no-extract]

Environment:
  CODEPO_ZIP_URL   Direct zip URL to download (optional)
  CODEPO_DIR       Target directory (default: ./codepo_gb)
  CODEPO_TMP_DIR   Temp directory (default: ./tmp)

If automatic download fails, download manually from:
  ${OS_DIRECT_DOWNLOAD_URL}

Info page:
  ${DATASET_PAGE_URL}
      `.trim());
      process.exit(0);
    }
  }

  return args;
}

async function downloadToFile(url, filePath) {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }
  await pipeline(res.body, fs.createWriteStream(filePath));
}

async function runUnzip(zipPath, outDir) {
  await new Promise((resolve, reject) => {
    const child = spawn('unzip', ['-o', zipPath, '-d', outDir], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`unzip exited with code ${code}`));
    });
  });
}

function findDatasetRoot(extractedDir) {
  const queue = [extractedDir];
  const visited = new Set();

  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    if (hasCsvDir(current)) return current;

    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;
      queue.push(path.join(current, entry.name));
    }
  }

  return null;
}

async function main() {
  const args = parseArgs(process.argv);

  if (hasCsvDir(args.targetDir)) {
    console.log(`✅ Code-Point Open already present at ${path.relative(REPO_ROOT, args.targetDir)}`);
    return;
  }

  if (fs.existsSync(args.targetDir) && !args.force) {
    throw new Error(
      `Target directory exists but doesn't look like Code-Point Open: ${args.targetDir}\n` +
        `Delete it or rerun with --force.`
    );
  }

  fs.mkdirSync(args.tmpDir, { recursive: true });

  const zipUrl = args.url || OS_DIRECT_DOWNLOAD_URL;

  const zipPath = path.join(args.tmpDir, 'codepo.zip');
  console.log(`⬇️  Downloading Code-Point Open...`);
  console.log(` - URL: ${zipUrl}`);
  console.log(` - ZIP: ${path.relative(REPO_ROOT, zipPath)}`);
  await downloadToFile(zipUrl, zipPath);

  if (args.noExtract) {
    console.log('ℹ️  Skipped extraction (--no-extract).');
    console.log(`Unzip ${path.relative(REPO_ROOT, zipPath)} into ${path.relative(REPO_ROOT, args.targetDir)}.`);
    return;
  }

  const extractDir = path.join(args.tmpDir, 'codepo_extracted');
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });

  console.log(`🗜️  Extracting ZIP...`);
  try {
    await runUnzip(zipPath, extractDir);
  } catch (error) {
    console.error(`❌ Failed to extract ZIP automatically (requires 'unzip' on PATH).`);
    console.error(`Unzip ${path.relative(REPO_ROOT, zipPath)} into ${path.relative(REPO_ROOT, args.targetDir)}.`);
    throw error;
  }

  const datasetRoot = findDatasetRoot(extractDir);
  if (!datasetRoot) {
    throw new Error(
      `Extracted ZIP but couldn't find a folder containing Data/CSV under ${path.relative(
        REPO_ROOT,
        extractDir
      )}`
    );
  }

  fs.rmSync(args.targetDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(args.targetDir), { recursive: true });

  console.log(`📁 Installing into ${path.relative(REPO_ROOT, args.targetDir)}...`);
  fs.renameSync(datasetRoot, args.targetDir);

  console.log(`✅ Code-Point Open installed.`);
  console.log(`Next: npm run build:postcodes`);
}

main().catch(err => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}`);
  console.error(`Manual download: ${OS_DIRECT_DOWNLOAD_URL}`);
  console.error(`Info page: ${DATASET_PAGE_URL}`);
  process.exit(1);
});
