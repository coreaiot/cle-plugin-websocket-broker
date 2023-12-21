const sioc = require('socket.io-client');
const { unzip } = require('zlib');

const c = sioc('https://192.168.123.186:7211', { rejectUnauthorized: false });

c.on('connect', () => {
  console.log('connected');
})

c.on('cle', msg => {
  unzip(msg, (err, buffer) => {
    if (err) return;
    const json = buffer.toString();
    console.log(json);
  });
});
