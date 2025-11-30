/*
  ensure-rollup-native.cjs
  - Runs on postinstall.
  - If Rollup native binary is missing, installs the appropriate optional package
    for the current platform/arch (Linux x64/arm64, macOS x64/arm64, Windows x64/arm64).
  - Skips unsupported platforms.
*/

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

function log(msg) {
  console.log(`[ensure-rollup-native] ${msg}`);
}

function getPlatformPackage() {
  const platform = process.platform; // 'linux' | 'darwin' | 'win32' | ...
  const arch = process.arch; // 'x64' | 'arm64' | ...

  if (platform === 'linux') {
    if (arch === 'x64') {
      const musl = detectMusl();
      return musl ? '@rollup/rollup-linux-x64-musl' : '@rollup/rollup-linux-x64-gnu';
    }
    if (arch === 'arm64') {
      const musl = detectMusl();
      return musl ? '@rollup/rollup-linux-arm64-musl' : '@rollup/rollup-linux-arm64-gnu';
    }
  }

  if (platform === 'darwin') {
    if (arch === 'arm64') return '@rollup/rollup-darwin-arm64';
    if (arch === 'x64') return '@rollup/rollup-darwin-x64';
  }

  if (platform === 'win32') {
    if (arch === 'x64') return '@rollup/rollup-win32-x64-msvc';
    if (arch === 'arm64') return '@rollup/rollup-win32-arm64-msvc';
  }

  return null;
}

function detectMusl() {
  try {
    const res = spawnSync('ldd', ['--version'], { encoding: 'utf8' });
    const out = (res.stdout || '') + (res.stderr || '');
    return /musl/i.test(out);
  } catch (_) {
    // Fallback: check if /lib/ld-musl is present
    try {
      const musl = fs.readdirSync('/lib').some((f) => /ld-musl/i.test(f));
      return musl;
    } catch (_) {
      return false;
    }
  }
}

function rollupNativePresent() {
  try {
    // This will attempt to load the platform-specific binary via Rollup's resolver.
    // If the platform package is missing, this require should throw.
    // Use require.resolve to avoid path issues.
    // eslint-disable-next-line import/no-dynamic-require, global-require
    require(require.resolve('rollup/dist/native.js', { paths: [path.join(__dirname, '..')] }));
    return true;
  } catch (e) {
    return false;
  }
}

function getInstalledRollupVersion() {
  try {
    const pkgPath = require.resolve('rollup/package.json', { paths: [path.join(__dirname, '..')] });
    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkgJson.version;
  } catch (_) {
    return null;
  }
}

(function main() {
  const pkg = getPlatformPackage();
  if (!pkg) {
    log(`Unsupported or unknown platform (${process.platform} ${process.arch}). Skipping.`);
    return;
  }

  if (rollupNativePresent()) {
    log('Rollup native binary already present. Nothing to do.');
    return;
  }

  const detectedVersion = getInstalledRollupVersion();
  const version = detectedVersion || '4.52.4';
  const cwd = path.join(__dirname, '..');
  log(`Installing ${pkg}@${version}...`);
  const res = spawnSync('pnpm', ['add', `${pkg}@${version}`], {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });

  if (res.status !== 0) {
    console.warn(`[ensure-rollup-native] Warning: failed to install ${pkg}@${version}. Continuing without it.`);
  } else {
    log('Install succeeded.');
  }
})();
