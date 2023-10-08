using System.Net.WebSockets;
using System.Text;
using ICSharpCode.SharpZipLib.Core;
using ICSharpCode.SharpZipLib.Zip.Compression.Streams;

var ws = new ClientWebSocket();

Console.WriteLine("Connecting ...");
await ws.ConnectAsync(new Uri("ws://192.168.123.186:44444"),
  CancellationToken.None);
Console.WriteLine("Connected");

await Task.Run(async () =>
{
  var buffer = new byte[4096];
  while (true)
  {
    var res = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
    var output = new MemoryStream();
    try
    {
      var dataBuffer = new byte[4096];
      using (var compressedStream = new MemoryStream(buffer, 0, res.Count))
      using (var stream = new InflaterInputStream(compressedStream))
        StreamUtils.Copy(stream, output, dataBuffer);
      var json = Encoding.UTF8.GetString(output.ToArray());
      Console.WriteLine(json);
    }
    catch (Exception ex)
    {
      Console.WriteLine(ex.ToString());
    }
  }
});
