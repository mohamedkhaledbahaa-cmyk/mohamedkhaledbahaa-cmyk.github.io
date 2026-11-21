// Make a 1200×675 JPG next to every SVG cover in public/images (used as og:image for social sharing).
// Usage: node tools/svg_to_jpg.cjs
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const dir = path.join(__dirname, '..', 'public', 'images');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 675 } });
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.svg'))) {
    const svg = fs.readFileSync(path.join(dir, f), 'utf8');
    await p.setContent(`<html><body style="margin:0"><div style="width:1200px;height:675px">${svg.replace('<svg ', '<svg width="1200" height="675" preserveAspectRatio="xMidYMid slice" ')}</div></body></html>`);
    await p.screenshot({ path: path.join(dir, f.replace(/\.svg$/, '.jpg')), type: 'jpeg', quality: 86 });
    console.log('✓', f.replace(/\.svg$/, '.jpg'));
  }
  await b.close();
})();
