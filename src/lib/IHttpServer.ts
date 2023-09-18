import { Server } from 'http';
import { Http2Server, SecureServerOptions } from 'http2';

export interface IHttpServer {
  httpServer: Server;
  http2Server: Http2Server;
}

export interface IHttpServerOpt {
  http: IHttpServerOptHttp;
  http2: IHttpServerOptHttp2;
}

export interface IHttpServerOptHttp {
  port: number;
  bindIp: string;
}

export interface IHttpServerOptHttp2 extends IHttpServerOptHttp {
  pems: string | SecureServerOptions;
}
