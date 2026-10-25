const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'css', 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
const swJs = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
const icon192 = fs.readFileSync(path.join(__dirname, 'icons', 'icon-192.png')).toString('base64');
const icon512 = fs.readFileSync(path.join(__dirname, 'icons', 'icon-512.png')).toString('base64');

// Build inline manifest JSON (data URI)
const manifest = {
  name: "Self Changing",
  short_name: "Self Changing",
  description: "Offline 12-Month Habit Tracker & Personal Growth App",
  start_url: "./",
  scope: "./",
  display: "standalone",
  orientation: "portrait",
  background_color: "#090d16",
  theme_color: "#10b981",
  icons: [
    { src: "data:image/png;base64," + icon192, sizes: "192x192", type: "image/png", purpose: "any maskable" },
    { src: "data:image/png;base64," + icon512, sizes: "512x512", type: "image/png", purpose: "any maskable" }
  ]
};
const manifestDataUri = "data:application/manifest+json," + encodeURIComponent(JSON.stringify(manifest));

// Inline SW registration (works from file:// too, falls back gracefully)
const swInlineScript = `
<script>
// Inline Service Worker for offline support
if ('serviceWorker' in navigator) {
  const swCode = ${JSON.stringify(swJs)};
  const blob = new Blob([swCode], { type: 'application/javascript' });
  const swUrl = URL.createObjectURL(blob);
  navigator.serviceWorker.register(swUrl).then(function(reg) {
    console.log('SW registered inline');
  }).catch(function(e) {
    console.log('SW inline reg failed (file:// context):', e);
  });
}
</script>`;

// Replace CSS link with inline <style>
let singleFile = indexHtml.replace(
  /<link\s+rel="stylesheet"\s+href="css\/style\.css[^"]*">/,
  `<style>\n${css}\n</style>`
);

// Replace JS script tag with inline <script>
singleFile = singleFile.replace(
  /<script\s+src="js\/app\.js[^"]*"><\/script>/,
  `${swInlineScript}\n<script>\n${js}\n</script>`
);

// Replace manifest link with inline data URI
singleFile = singleFile.replace(
  '<link rel="manifest" href="manifest.json">',
  `<link rel="manifest" href="${manifestDataUri}">`
);

// Replace apple touch icon with inline base64
singleFile = singleFile.replace(
  '<link rel="apple-touch-icon" href="icons/icon-192.png">',
  `<link rel="apple-touch-icon" href="data:image/png;base64,${icon192}">`
);

// Replace favicon
singleFile = singleFile.replace(
  '<link rel="icon" type="image/svg+xml" href="icons/icon.svg">',
  `<link rel="icon" type="image/png" href="data:image/png;base64,${icon192}">`
);

fs.writeFileSync(path.join(__dirname, 'self-changing-offline.html'), singleFile, 'utf8');
console.log('✅ Created fully self-contained standalone file: self-changing-offline.html');
console.log('📁 Size:', Math.round(fs.statSync(path.join(__dirname, 'self-changing-offline.html')).size / 1024), 'KB');
