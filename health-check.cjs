const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3006,
  path: '/api/health',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Health check response:', data);
  });
});

req.on('error', (e) => {
  console.error('Health check error:', e.message);
});

req.end();
