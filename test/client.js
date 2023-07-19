const { WebSocket } = require('ws');

const ws = new WebSocket('wss://192.168.123.192:7211', {
    rejectUnauthorized: false,
});

ws.on('error', console.error);
ws.on('message', console.log);