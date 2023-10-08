const { WebSocket } = require('ws');
const { unzip } = require('zlib');

const ws = new WebSocket('ws://192.168.123.186:44444', {
  rejectUnauthorized: false,
});

ws.on('open', () => console.log('Connected'));
ws.on('error', console.error);
ws.on('message', msg => {
  unzip(msg, (err, buf) => {
    if (err) return;
    const obj = JSON.parse(buf.toString());
    console.log(obj);
  });
});
