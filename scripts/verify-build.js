const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'renderer', 'dist', 'index.html');
console.log(`Verifying production renderer build at: ${target}`);

if (!fs.existsSync(target)) {
  console.error('\x1b[31mError: renderer/dist/index.html not found! Run "npm run build" or "npm run build:renderer" first.\x1b[0m');
  process.exit(1);
}

const stats = fs.statSync(target);
if (stats.size === 0) {
  console.error('\x1b[31mError: renderer/dist/index.html is empty! Build might have failed.\x1b[0m');
  process.exit(1);
}

console.log('\x1b[32mSuccess: Production build verified successfully!\x1b[0m');
process.exit(0);
