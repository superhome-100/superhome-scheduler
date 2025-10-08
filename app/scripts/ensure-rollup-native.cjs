/*
  ensure-rollup-native.cjs
  - Runs on postinstall.
  - If on Linux x64 and Rollup native binary is missing, installs the appropriate optional package.
  - No-op on other platforms (fixes EBADPLATFORM on macOS/Windows).
*/

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

function log(msg) {
  console.log(`[ensure-rollup-native] ${msg}`);
}

function isLinuxX64() {
  return process.platform === 'linux' && process.arch === 'x64';
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
    // This file requires the platform package internally.
    require(path.join('..', 'node_modules', 'rollup', 'dist', 'native.js'));
    return true;
  } catch (e) {
    return false;
  }
}

(function main() {
  if (!isLinuxX64()) {
    log('Non-linux-x64 platform detected. Skipping.');
    return;
  }

  if (rollupNativePresent()) {
    log('Rollup native binary already present. Nothing to do.');
    return;
  }

  const isMusl = detectMusl();
  const pkg = isMusl ? '@rollup/rollup-linux-x64-musl' : '@rollup/rollup-linux-x64-gnu';
  const version = '4.52.4';
  const cwd = path.join(__dirname, '..');

  log(`Installing ${pkg}@${version} (musl=${isMusl})...`);
  const res = spawnSync('npm', ['i', `${pkg}@${version}`, '--no-save'], {
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
