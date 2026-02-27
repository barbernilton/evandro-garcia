import fs from 'fs';
import path from 'path';

const distDir = 'dist';

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });

const wrapperContent = `
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.chdir(path.join(__dirname, '..'));

import('../server/index.js');
`;

fs.writeFileSync(path.join(distDir, 'index.mjs'), wrapperContent.trim());

console.log('Build completed successfully!');
