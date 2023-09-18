export * from './config';
export * from './status';
export * from './i18n';

import { IHttpServer, IHttpServerOpt, Plugin, Utils } from './lib';
import { deflate } from 'zlib';
import { readFile, writeFile } from 'fs/promises';
import { WebSocketServer, OPEN } from 'ws';

function deflateStr(str: string) {
  return new Promise<Buffer>((r, rr) => {
    deflate(Buffer.from(str), (err, out) => {
      if (err) return rr(err);
      return r(out);
    });
  });
}

export async function init(self: Plugin, utils: Utils) {
  return true;
}

export async function initHttp(self: Plugin, utils: Utils, server: IHttpServer, options: IHttpServerOpt) {
  const config = await utils.loadConfig(self);

  self.status.subscribers = [];

  const wss = new WebSocketServer({
    server: server.httpServer,
  });

  let wss2 = options.http2 ? new WebSocketServer({
    server: server.http2Server as any,
  }) : undefined;

  function updateStatus() {
    self.status.subscribers = [];
    wss.clients.forEach(ws => {
      if (ws.readyState === OPEN) {
        self.status.subscribers.push({ value: ws['ip'] + ':' + ws['port'] });
      }
    });
    wss2 && wss2.clients.forEach(ws => {
      if (ws.readyState === OPEN) {
        self.status.subscribers.push({ value: ws['ip'] + ':' + ws['port'] });
      }
    });
    utils.updateStatus(self);
  }

  function onConnection(ws, req) {
    ws.ip = req.headers['x-forwarded-for'] ?
      req.headers['x-forwarded-for'].split(',')[0].trim() :
      req.socket.remoteAddress;
    ws.port = req.socket.remotePort;
    ws.on('error', self.logger.error);
    self.logger.info(`client ${ws.ip} connected.`);
    updateStatus();
  }

  wss.on('connection', onConnection);
  wss2 && wss2.on('connection', onConnection);

  setInterval(() => {
    updateStatus();
  }, 1000);

  const intervalfn = async (type, dataFn) => {
    if (!self.status.subscribers.length) return;
    const data = dataFn();
    const keys = Object.keys(data);
    if (keys.length) {
      const json = JSON.stringify({
        type,
        data,
      });


      const toSend = config.compress ? (await deflateStr(json)) : json;

      wss.clients.forEach(client => {
        if (client.readyState === OPEN) {
          client.send(toSend, { binary: config.compress });
        }
      });
      wss2 && wss2.clients.forEach(client => {
        if (client.readyState === OPEN) {
          client.send(toSend, { binary: config.compress });
        }
      });
    }
  };

  setInterval(() => intervalfn('sensors', () => {
    const now = new Date().getTime();
    const ts = config.postOutdatedTags ? now - utils.projectEnv.beaconLifeTime : now - utils.projectEnv.beaconAuditTime;
    const buf = utils.ca.getBeaconsBuffer(ts);

    const data = {};
    if (buf.length > 5) {
      const bsize = buf.readUint16LE(3);
      const n = (buf.length - 5) / bsize;
      for (let i = 0; i < n; ++i) {
        const b = utils.parseBeaconResult(utils.projectChannels, buf, i * bsize + 5);
        data[b.mac] = b;
        delete b.mac;
      }
    }
    return data;
  }), utils.projectEnv.beaconAuditTime);

  setInterval(() => intervalfn('locators', () => {
    const now = new Date().getTime();
    const ts = now - utils.projectEnv.locatorLifeTime;
    const data = utils.packGatewaysByAddr(utils.activeLocators, ts);
    return data;
  }), utils.projectEnv.locatorAuditTime);

  self.logger.info('Websocket initialized.');
}

export async function test(self: Plugin, utils: Utils) {
  self.logger.info('Test', self.name);
  self.logger.info('Loading Config ..');
  const config = await utils.loadConfig(self);
  console.log(config);
  self.logger.info('Test OK.');
}
