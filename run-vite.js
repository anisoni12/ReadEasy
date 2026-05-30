const { spawn } = require('child_process');
const path = require('path');

const vitePath = path.join(__dirname, 'artifacts', 'readeasy');
const vite = spawn('npx', ['vite', '--config', 'vite.config.ts', '--host', '0.0.0.0'], {
  cwd: vitePath,
  shell: true,
  stdio: 'inherit'
});

vite.on('error', (err) => {
  console.error('Failed to start vite:', err);
});

vite.on('close', (code) => {
  console.log(`Vite exited with code ${code}`);
});
