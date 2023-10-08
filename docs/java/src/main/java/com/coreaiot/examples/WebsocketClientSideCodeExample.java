package com.coreaiot.examples;

import java.io.*;
import java.net.*;
import java.nio.ByteBuffer;
import java.util.zip.*;

import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

public class WebsocketClientSideCodeExample {
  public static void main(String[] args) throws URISyntaxException {
    WebSocketClient c = new WebSocketClient(
        new URI("ws://192.168.123.186:44444")) {
      @Override
      public void onOpen(ServerHandshake handshakedata) {
        System.out.println("Connected");
      }

      @Override
      public void onMessage(String message) {
      }

      @Override
      public void onMessage(ByteBuffer buffer) {
        try {
          System.out.println(new String(unzip(buffer.array())));
        } catch (IOException e) {
          e.printStackTrace();
        } catch (DataFormatException e) {
          e.printStackTrace();
        }
      }

      @Override
      public void onClose(int code, String reason, boolean remote) {
      }

      @Override
      public void onError(Exception ex) {
        ex.printStackTrace();
      }
    };
    System.out.println("Connecting ...");
    c.connect();
  }

  public static byte[] unzip(byte[] data) throws IOException, DataFormatException {
    Inflater inf = new Inflater();
    inf.setInput(data);
    ByteArrayOutputStream baos = new ByteArrayOutputStream();
    byte[] buffer = new byte[1024];
    while (!inf.finished()) {
      int count = inf.inflate(buffer);
      baos.write(buffer, 0, count);
    }
    baos.close();
    return baos.toByteArray();
  }
}