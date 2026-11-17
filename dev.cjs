const { spawn } = require('node:child_process');
const path = require('node:path');

const api = spawn(process.execPath, [path.join(__dirname, 'server.cjs')], {
  stdio: 'inherit'
});
const vite = spawn(
  process.execPath,
  [
    path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js'),
    '--host',
    '127.0.0.1',
    ...process.argv.slice(2)
  ],
  { stdio: 'inherit' }
);
const children = [api, vite];
let stopping = false;

function stop(exitCode) {
  if (stopping) {
    return;
  }

  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) {
    if (child.exitCode === null) {
      child.kill();
    }
  }
}

for (const child of children) {
  child.on('error', error => {
    console.error(error);
    stop(1);
  });
  child.on('exit', code => {
    if (!stopping) {
      stop(code ?? 1);
    }
  });
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
