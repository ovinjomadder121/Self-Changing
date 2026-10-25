const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, reqPath);

  // Security: prevent path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIPs = getLocalIPs();
  console.log('\n======================================================');
  console.log('🚀 Self Changing App is running!');
  console.log('======================================================\n');
  console.log('📱 Phone a install korar jonno:');
  console.log('১. আপনার কম্পিউটার এবং ফোন একই Wi-Fi তে কানেক্ট রাখুন।');
  console.log('২. আপনার ফোনের Google Chrome ব্রাউজারে নিচের যেকোনো একটি লিঙ্ক ওপেন করুন:');
  
  if (localIPs.length > 0) {
    localIPs.forEach(ip => {
      console.log(`   👉 http://${ip}:${PORT}`);
    });
  } else {
    console.log(`   👉 http://localhost:${PORT}`);
  }

  console.log('\n৩. লিঙ্কে ঢোকার পর উপরে বা নিচে "Install App" বা Chrome এর ৩-ডট (⋮) মেনু থেকে "Add to Home screen" এ চাপ দিন।');
  console.log('৪. ব্যস! আপনার ফোনে Self Changing অ্যাপটি ইনস্টল হয়ে যাবে এবং কোনো ইন্টারনেট ছাড়াই চলবে!\n');
  console.log('💻 Computer এ দেখতে: http://localhost:' + PORT);
  console.log('======================================================\n');
});
