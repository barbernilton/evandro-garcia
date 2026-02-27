import fs from 'fs';
import path from 'path';

const distDir = 'dist';

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Create CommonJS wrapper that loads the ES module server
const wrapperContent = `
const path = require('path');
process.chdir(path.join(__dirname, '..'));
import('../server/index.js');
`;

fs.writeFileSync(path.join(distDir, 'index.cjs'), wrapperContent.trim());

console.log('Build completed successfully!');
