export * from './config';
export * from './status';
export * from './i18n';

import { Plugin, Utils, generateDocs, IHttpServer, IHttpServerOpt, IGatewayResult } from '@lib';
import { deflate, gzip } from 'zlib';
import { WebSocketServer, OPEN } from 'ws';

const DATA_FORMAT_JSON = 0;
const DATA_FORMAT_JSON_DEFLATE = 1;
const DATA_FORMAT_JSON_GZIP = 1;
const DATA_FORMAT_BINARY = 3;

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
  }

  function onConnection(ws, req) {
    ws.ip = req.headers['x-forwarded-for'] ?
      req.headers['x-forwarded-for'].split(',')[0].trim() :
      req.socket.remoteAddress;
    ws.port = req.socket.remotePort;
    ws.on('error', self.logger.error);
    ws.on('close', () => {
      self.logger.info(`client ${ws.ip} disconnected.`);
    });
    self.logger.info(`client ${ws.ip} connected.`);
    updateStatus();
  }

  wss.on('connection', onConnection);
  wss2 && wss2.on('connection', onConnection);


  function hasClient() {
    return wss.clients.size || (wss2 && wss2.clients.size);
  }

  function send(data: string | Buffer, binary = false) {
    wss.clients.forEach(client => {
      if (client.readyState === OPEN) {
        client.send(data, { binary });
      }
    });
    wss2 && wss2.clients.forEach(client => {
      if (client.readyState === OPEN) {
        client.send(data, { binary });
      }
    });
  }

  if (config.postBeacons)
    utils.ee.on('beacon-audit-time', () => {
      if (!hasClient()) return;
      const now = new Date().getTime();
      const ts = config.postOutdatedTags ? now - utils.projectEnv.beaconLifeTime : now - utils.projectEnv.beaconAuditTime;
      const buf = utils.ca.getBeaconsBuffer(ts);

      if (buf.length > 5) {
        const bsize = buf.readUint16LE(3);
        const n = (buf.length - 5) / bsize;
        if (config.dataFormat === DATA_FORMAT_BINARY) {
          send(buf, true);
          if (self.debug)
            self.logger.debug(n, 'beacons sent.');
        } else {
          const data = {};
          for (let i = 0; i < n; ++i) {
            const b = utils.parseBeaconResult(buf, i * bsize + 5);
            data[b.mac] = b;
            delete b.mac;
          }
          const json = JSON.stringify({
            type: 'sensors',
            data,
            timestamp: now,
          });
          if (config.dataFormat === DATA_FORMAT_JSON_DEFLATE) {
            deflate(Buffer.from(json), (err, out) => {
              if (err) {
                if (self.debug)
                  self.logger.error(err);
              } else {
                send(out, true);
                if (self.debug)
                  self.logger.debug(n, 'beacons sent.');
              }
            });
          } else if (config.dataFormat === DATA_FORMAT_JSON_GZIP) {
            gzip(Buffer.from(json), (err, out) => {
              if (err) {
                if (self.debug)
                  self.logger.error(err);
              } else {
                send(out, true);
                if (self.debug)
                  self.logger.debug(n, 'beacons sent.');
              }
            });
          } else {
            send(json);
            if (self.debug)
              self.logger.debug(n, 'beacons sent.');
          }
        }
      }
    });

  if (config.postLocators)
    utils.ee.on('locator-audit-time', () => {
      if (!hasClient()) return;

      const now = new Date().getTime();
      const ts = now - utils.projectEnv.locatorLifeTime;
      const buf = utils.ca.getLocatorsBuffer(config.postOfflineLocators ? 0 : ts);
      if (buf.length > 5) {
        const bsize = buf.readUint16LE(3);
        const n = (buf.length - 5) / bsize;
        if (config.dataFormat === DATA_FORMAT_BINARY) {
          send(buf, true);
          if (self.debug)
            self.logger.debug(n, 'locators sent.');
        } else {
          const locators: IGatewayResult[] = [];
          for (let i = 0; i < n; ++i) {
            const l = utils.parseLocatorResult(buf, i * bsize + 5, ts);
            locators.push(l);
          }
          const data = utils.packGatewaysByAddr(locators);

          const json = JSON.stringify({
            type: 'locators',
            data,
            timestamp: now,
          });
          if (config.dataFormat === DATA_FORMAT_JSON_DEFLATE) {
            deflate(Buffer.from(json), (err, out) => {
              if (err) {
                if (self.debug)
                  self.logger.error(err);
              } else {
                send(out, true);
                if (self.debug)
                  self.logger.debug(n, 'locators sent.');
              }
            });
          } else if (config.dataFormat === DATA_FORMAT_JSON_GZIP) {
            gzip(Buffer.from(json), (err, out) => {
              if (err) {
                if (self.debug)
                  self.logger.error(err);
              } else {
                send(out, true);
                if (self.debug)
                  self.logger.debug(n, 'locators sent.');
              }
            });
          } else {
            send(json);
            if (self.debug)
              self.logger.debug(n, 'locators sent.');
          }
        }
      }
    });

  return true;
}

export async function test(self: Plugin, utils: Utils) {
  self.logger.info('Test', self.name);
  self.logger.info('Loading Config ..');
  const config = await utils.loadConfig(self);
  console.log(config);
  self.logger.info('Test OK.');
}

export const docs = generateDocs();