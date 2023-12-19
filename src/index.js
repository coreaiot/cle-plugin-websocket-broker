const config = require('./config');
const status = require('./status');
const i18n = require('./i18n');
require('./type');
const { WebSocketServer, OPEN } = require('ws');
const { deflate } = require('zlib');

function deflateStr(str) {
  return new Promise((r, rr) => {
    deflate(Buffer.from(str), (err, out) => {
      if (err) return rr(err);
      return r(out);
    });
  });
}

/**
 * @param {IPlugin} self 
 * @param {Object} env 
 * @param {IUtils} utils 
 * @param {IGateways} gateways 
 * @param {IBeacons} beacons 
 * @returns {Promise<boolean>}
 */
async function init(self, env, utils, gateways, beacons) {
  return true;
}

/**
 * 
 * @param {IHttpServer} server 
 * @param {IHttpServerOpt} options 
 * @param {IPlugin} self 
 * @param {Object} env 
 * @param {IUtils} utils 
 * @param {IGateways} gateways 
 * @param {IBeacons} beacons 
 * @returns {Promise<void>}
 */
async function initHttp(server, options, self, env, utils, gateways, beacons) {
  self.status.subscribers = [];

  const wss = new WebSocketServer({
    server: server.httpServer,
  });

  let wss2 = options.http2 ? new WebSocketServer({
    server: server.http2Server,
  }) : undefined;

  function updateStatus() {
    self.status.subscribers = [];
    wss.clients.forEach(ws => {
      if (ws.readyState === OPEN) {
        self.status.subscribers.push({ value: ws.ip });
      }
    });
    wss2 && wss2.clients.forEach(ws => {
      if (ws.readyState === OPEN) {
        self.status.subscribers.push({ value: ws.ip });
      }
    });
  }

  function onConnection(ws, req) {
    ws.ip = req.headers['x-forwarded-for'] ?
      req.headers['x-forwarded-for'].split(',')[0].trim() :
      req.socket.remoteAddress;
    ws.on('error', self.logger.error);
    self.logger.info(`client ${ws.ip} connected.`);
    updateStatus();

    ws.on('close', () => {
      self.logger.info(`client ${ws.ip} disconnected.`);
      updateStatus();
    });
  }

  wss.on('connection', onConnection);
  wss2 && wss2.on('connection', onConnection);

  const intervalfn = async (type, dataFn) => {
    if (!self.status.subscribers.length) return;
    const data = dataFn();
    const keys = Object.keys(data);
    if (keys.length) {
      const json = JSON.stringify({
        type,
        data,
      });

      const zip = await deflateStr(json);

      wss.clients.forEach(client => {
        if (client.readyState === OPEN) {
          client.send(zip, { binary: true });
        }
      });
      wss2 && wss2.clients.forEach(client => {
        if (client.readyState === OPEN) {
          client.send(zip, { binary: true });
        }
      });
    }
  };

  setInterval(() => intervalfn('sensors', () => {
    const now = new Date().getTime();
    const data = {};
    for (const [k, v] of Object.entries(beacons)) {
      const exp = config.postOutdatedTags ? v.updatedAt + env.beaconLifetime : v.updatedAt + env.beaconAuditTime;
      if (v.x !== undefined && exp > now)
        data[k] = v;
    }
    return data;
  }), env.beaconAuditTime);

  setInterval(() => intervalfn('locators', () => {
    const now = new Date().getTime();
    const data = {};
    for (const [k, v] of Object.entries(gateways)) {
      data[k] = {
        ...v,
        online: v.updatedAt + env.gatewayLifeTime >= now,
      };
    }
    return data;
  }), env.gatewayAuditTime);
  self.logger.info('Websocket initialized.');
}

/**
 * @param {IPlugin} self
 * @param {IUtils} utils
 */
async function test(self, utils) {
  self.logger.info('Test', self.name);
  self.logger.info('Loading Config ..');
  const config = await utils.loadConfig(self);
  console.log(config);
  const green = utils.modules.colors.green('green');
  self.logger.info('Module `colors`', green);
  self.logger.info('Module `glob`', typeof utils.modules.glob.sync === 'function');
  self.logger.info('Module `json5`', utils.modules.json5.parse('{ a: 1 }'));
  const now = utils.modules.moment().format('YYYY-MM-DD HH:mm:ss');
  self.logger.info('Module `moment`', now);
  self.logger.info('Module `nanoid`', utils.modules.nanoid(6));
  self.logger.info('Test OK.');
  process.exit(0);
}

module.exports = { init, initHttp, test, config, status, i18n };
