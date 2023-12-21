import { EventEmitter } from 'events';
import { IHttpServer, IHttpServerOpt } from '@lib';
import { WebSocketServer, OPEN } from 'ws';

const sio2 = require('socket.io.2x');
const sio3 = require('socket.io.3x');
const sio4 = require('socket.io.4x');

const BACKEND_SOCKET_IO_2X = 0;
const BACKEND_SOCKET_IO_3X = 1;
const BACKEND_SOCKET_IO_4X = 2;
const BACKEND_WEBSOCKET = -1;

export class WebsocketBackend extends EventEmitter {
  wss;
  wss2;

  constructor(
    public backend: number,
    public server: IHttpServer,
    public options: IHttpServerOpt,
  ) {
    super();
    switch (backend) {
      case BACKEND_WEBSOCKET: (() => {
        const onConnection = (ws, req) => {
          ws.ip = req.headers['x-forwarded-for'] ?
            req.headers['x-forwarded-for'].split(',')[0].trim() :
            req.socket.remoteAddress;
          ws.id = req.socket.remotePort;
          ws.on('error', () => this.emit('error'));
          ws.on('close', () => this.emit('disconnect', ws));
          this.emit('connect', ws);
        }

        this.wss = new WebSocketServer({
          server: server.httpServer,
        });
        this.wss.on('connection', onConnection);

        if (options.http2) {
          this.wss2 = new WebSocketServer({
            server: server.http2Server as any,
          });
          this.wss2.on('connection', onConnection);
        }
      })();
        break;
      case BACKEND_SOCKET_IO_4X: (() => {
        const onConnection = (ws) => {
          ws.ip = ws.handshake.headers['x-forwarded-for'] ?
            ws.handshake.headers['x-forwarded-for'].split(',')[0].trim() :
            ws.conn.remoteAddress;
          ws.on('error', () => this.emit('error'));
          ws.on('disconnect', () => this.emit('disconnect', ws));
          this.emit('connect', ws);
        }

        this.wss = sio4(server.httpServer, { serveClient: false });
        this.wss.on('connection', onConnection);

        if (options.http2) {
          this.wss2 = sio4(server.http2Server as any, { serveClient: false });
          this.wss2.on('connection', onConnection);
        }
      })();
        break;
      case BACKEND_SOCKET_IO_3X: (() => {
        const onConnection = (ws) => {
          ws.ip = ws.handshake.headers['x-forwarded-for'] ?
            ws.handshake.headers['x-forwarded-for'].split(',')[0].trim() :
            ws.conn.remoteAddress;
          ws.on('error', () => this.emit('error'));
          ws.on('disconnect', () => this.emit('disconnect', ws));
          this.emit('connect', ws);
        }

        this.wss = sio3(server.httpServer, { serveClient: false });
        this.wss.on('connection', onConnection);

        if (options.http2) {
          this.wss2 = sio3(server.http2Server as any, { serveClient: false });
          this.wss2.on('connection', onConnection);
        }
      })();
        break;
      default: (() => {
        const onConnection = (ws) => {
          ws.ip = ws.handshake.headers['x-forwarded-for'] ?
            ws.handshake.headers['x-forwarded-for'].split(',')[0].trim() :
            ws.conn.remoteAddress;
          ws.on('error', () => this.emit('error'));
          ws.on('disconnect', () => this.emit('disconnect', ws));
          this.emit('connect', ws);
        }

        this.wss = sio2(server.httpServer, { serveClient: false });
        this.wss.on('connection', onConnection);
      })();
    }
  }

  send(data: string | Buffer, binary = false) {
    switch (this.backend) {
      case BACKEND_WEBSOCKET: (() => {
        this.wss.clients.forEach(client => {
          if (client.readyState === OPEN) {
            client.send(data, { binary });
          }
        });
        if (this.wss2) this.wss2.clients.forEach(client => {
          if (client.readyState === OPEN) {
            client.send(data, { binary });
          }
        });
      })();
        break;

      case BACKEND_SOCKET_IO_4X:
      case BACKEND_SOCKET_IO_3X:
      case BACKEND_SOCKET_IO_2X:
      default: (() => {
        this.wss.sockets.emit('cle', data);
        if (this.wss2) {
          this.wss2.sockets.emit('cle', data);
        }
      })();
    }
  }

  hasClient() {
    switch (this.backend) {
      case BACKEND_WEBSOCKET:
        return !!(this.wss.clients.size || (this.wss2 && this.wss2.clients.size));

      case BACKEND_SOCKET_IO_4X:
      case BACKEND_SOCKET_IO_3X:
        if (this.wss.sockets.sockets.size)
          return true;
        if (this.wss2 && this.wss2.sockets.sockets.size)
          return true;
        return false;
      case BACKEND_SOCKET_IO_2X:
      default:
        if (Object.values(this.wss.sockets.sockets).length)
          return true;
        if (this.wss2 && Object.values(this.wss2.sockets.sockets).length)
          return true;
        return false;
    }
  }

  getClients(): {
    ip: string;
    id: string;
  }[] {
    switch (this.backend) {
      case BACKEND_WEBSOCKET: return (() => {
        const wss = [];
        this.wss.clients.forEach(ws => {
          if (ws.readyState === OPEN) {
            wss.push(ws);
          }
        });
        if (this.wss2) this.wss2.clients.forEach(ws => {
          if (ws.readyState === OPEN) {
            wss.push(ws);
          }
        });
        return wss;
      })();

      case BACKEND_SOCKET_IO_4X:
      case BACKEND_SOCKET_IO_3X: return (() => {
        const wss = [];
        this.wss.sockets.sockets.forEach(ws => {
          wss.push(ws);
        });
        if (this.wss2) {
          this.wss2.sockets.sockets.forEach(ws => {
            wss.push(ws);
          });
        }
        return wss;
      })();

      case BACKEND_SOCKET_IO_2X:
      default: return (() => {
        const wss = [];
        Object.values(this.wss.sockets.sockets).forEach(ws => {
          wss.push(ws);
        });
        if (this.wss2) {
          Object.values(this.wss2.sockets.sockets).forEach(ws => {
            wss.push(ws);
          });
        }
        return wss;
      })();
    }
  }
}