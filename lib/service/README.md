## Websocket message format

https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers

```
 0               1               2               3
 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |   (if payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
 4               5               6               7
+ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
|     Extended payload length continued, if payload len == 127  |
+ - - - - - - - - - - - - - - - +-------------------------------+
 8               9               10              11
+ - - - - - - - - - - - - - - - +-------------------------------+
|                               |Masking-key, if MASK set to 1  |
+-------------------------------+-------------------------------+
 12              13              14              15
+-------------------------------+-------------------------------+
| Masking-key (continued)       |          Payload Data         |
+-------------------------------- - - - - - - - - - - - - - - - +
:                     Payload Data continued ...                :
+ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
|                     Payload Data continued ...                |
+---------------------------------------------------------------+
```

## Websocket handshake

https://tools.ietf.org/html/rfc6455#page-6

> The first piece of information comes from the |Sec-WebSocket-Key| header
  field in the client handshake:
>
>    Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
>
  For this header field, the server has to take the value (as present
  in the header field, e.g., the base64-encoded [RFC4648] version minus
  any leading and trailing whitespace) and concatenate this with the
  Globally Unique Identifier (GUID, [RFC4122]) "258EAFA5-E914-47DA-
  95CA-C5AB0DC85B11" in string form, ...  A SHA-1 hash (160 bits) [FIPS.180-3],
  base64-encoded, of this concatenation is then returned in the server's
  handshake.

### Respons header:

The above generated key is past down through the `Sec-WebSocket-Accept` header.

```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```
