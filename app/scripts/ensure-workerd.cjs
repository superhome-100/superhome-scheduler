/*
  ensure-workerd.cjs
  - Runs on postinstall.
  - Avoids EBADPLATFORM by not installing non-matching @cloudflare/workerd-* packages.
  - If on Linux, ensures the matching workerd package is present for dependencies that need it.
*/

const { spawnSync } = require('node:child_process');
const path = require('node:path');

function log(msg) {
  console.log(`[ensure-workerd] ${msg}`);
}

function isLinux() {
  return process.platform === 'linux';
}

function install(pkg, version) {
  const cwd = path.join(__dirname, '..');
  const spec = version ? `${pkg}@${version}` : pkg;
  log(`Installing ${spec} --no-save`);
  const res = spawnSync('npm', ['i', spec, '--no-save'], {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
  if (res.status !== 0) {
    log(`Warning: failed to install ${spec}. Continuing.`);
  }
}

(function main() {
  // If not Linux, do nothing to avoid EBADPLATFORM on macOS/Windows
  if (!isLinux()) {
    log('Non-Linux platform detected. Skipping.');
    return;
  }

  const arch = process.arch; // 'x64' or 'arm64'
  const pin = process.env.WORKERD_VERSION || '';

  if (arch === 'x64') {
    install('@cloudflare/workerd-linux-64', pin);
  } else if (arch === 'arm64') {
    install('@cloudflare/workerd-linux-arm64', pin);
  } else {
    log(`Unsupported Linux arch (${arch}). Skipping.`);
  }
})();
