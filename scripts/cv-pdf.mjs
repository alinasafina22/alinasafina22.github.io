// Rebuilds public/cv.pdf from the English /cv/ page, using the print styles in src/views/Cv.astro.
// First time only: npm i -D playwright && npx playwright install chromium
// Then: npm run build && node scripts/cv-pdf.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const server = createServer(async (req, res) => {
  let path = join('dist', decodeURIComponent(req.url.split('?')[0]));
  if (path.endsWith('/')) path += 'index.html';
  try {
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404); res.end();
  }
}).listen(4399);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:4399/cv/', { waitUntil: 'networkidle' });
await page.evaluate(() => (document.documentElement.dataset.theme = 'light'));
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: 'public/cv.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();
server.close();
console.log('public/cv.pdf updated');
