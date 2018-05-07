const
encoding  = require('encoding'),
crypto    = require('crypto'),
Debug     = require('@superhero/debug'),
Server    = require('net').Server,
Events    = require('events');

module.exports = class
{
  constructor(options)
  {
    this.config = Object.assign(
    {
      debug   : true,
      onClose : false
    }, options);

    this.guid     = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
    this.debug    = new Debug({debug:this.config.debug});
    this.events   = new Events();
    this.server   = new Server();
    this.sockets  = [];

    // ping-pong to keep the connection alive
    this.events.on('ping', (socket) => socket.emit('pong'));

    for(let event of ['close','connection','listening','error'])
      this.server.on(event, () => this.debug.log('server:', event));

    this.server.on('connection', this.onConnection.bind(this));
  }

  onConnection(socket)
  {
    this.sockets.push(socket);

    for(let event of ['close','connection','drain','end','lookup','timeout','error'])
      socket.on(event, () => this.debug.log('socket:', event));

    const ctx   = {socket};
    ctx.emit    = this.emit.bind(this, ctx);
    ctx.chunks  = [];

    //socket.on('data',  this.onData .bind(this, socket));
    socket.on('data',  this.onData .bind(this, ctx));
    socket.on('close', this.onClose.bind(this, ctx));
  }

  onData(ctx, data)
  {
    // messages can come in multiple chunks that needs to be glued together
    ctx.buffer = Buffer.concat([ctx.buffer, data].filter(_ => _));

    if(!ctx.headers)
      this.handshake(ctx);

    if(ctx.headers)
      this.dispatch(ctx);
  }

  onClose(ctx)
  {
    this.sockets.splice(this.sockets.indexOf(ctx.socket), 1);
    this.config.onClose && this.config.onClose(ctx);
  }

  handshake(ctx)
  {
    const s = ctx.buffer.toString();
    if(s.match(/\r\n\r\n/))
    {
      // parse headers and store remaining buffer
      const
      parts   = s.split('\r\n\r\n'),
      rows    = parts.shift().split('\r\n'),
      buffer  = parts.join(''),
      divided = rows.map((row) => row.split(':').map((item) => item.trim())),
      headers = divided.reduce((obj, header) =>
      {
        obj[header[0]] = header[1];
        return obj;
      }, {});

      ctx.headers  = headers;
      ctx.buffer   = Buffer.from(buffer);

      // write headers back to the client and establish a handshake
      ctx.socket.write(
      [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: WebSocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Accept: ' + this.keygen(headers['Sec-WebSocket-Key'])
      ].join('\r\n') + '\r\n\r\n');
    }
  }

  dispatch(ctx)
  {
    // messages can also come in the same chunk that needs to be divided...
    for(const decoded of this.decode(ctx.buffer))
    {
      ctx.buffer = decoded.buffer;

      // destroys the socket if specific 2 bytes
      // well, this works.. but I have no clue why, the specifications
      // states [0xFF][0x00]. Or if older protocol: [0x00][message][0xFF]
      if(decoded.msg.length == 2
      &&(decoded.msg.charCodeAt(0) == 3 && decoded.msg.charCodeAt(1) == 233)
      ||(decoded.msg.charCodeAt(0) == 3 && decoded.msg.charCodeAt(1) == 65533))
      {
        ctx.socket.destroy();
        break;
      }
      else
      {
        try
        {
          ctx.chunks.push(decoded.msg);

          const
          msg = ctx.chunks.join(),
          dto = JSON.parse(msg);

          ctx.chunks.length = 0;
          this.debug.log('received message:', dto);
          this.events.emit(dto.event, ctx, dto.data);
        }
        catch(_)
        {
          this.debug.log('a message could not be parsed:', ctx.chunks);
        }
      }
    }
  }

  emit(ctx, event, data, toAll)
  {
    this.debug.log('emitting, to everyone:', !!toAll, 'event:', event, 'data:', data);

    const encoded = this.encode(JSON.stringify({event, data}));

    for(let _socket of (toAll ? this.sockets : [ctx.socket]))
      setImmediate(() => _socket.write(encoded, 'binary'));
  }

  keygen(key)
  {
    // @link https://tools.ietf.org/html/rfc6455#page-6
    return crypto.createHash('sha1').update(key + this.guid).digest('base64');
  }

  encode(data)
  {
    let header;

    const
    payload = Buffer.from(data, 'utf8'),
    length  = payload.length;

    if(length <= 125)
    {
      header    = new Buffer(2);
      header[1] = length;
    }
    else if(length <= 65535)
    {
      header    = new Buffer(4);
      header[1] = 126;
      header[2] = (length >> 8) & 255;
      header[3] = (length     ) & 255;
    }
    else
    {
      header    = new Buffer(10);
      header[1] = 127;

      const unit = 256;
      for(let i = 9, left = length; i > 1 && left > 0; i--)
      {
        header[i] = left % unit;
        left /= unit;
      }
    }
    header[0] = 129;
    return Buffer.concat([header, payload]);
  }

  * decode(buffer)
  {
    const
    pack    = buffer[1] & 127,
    iniMask = pack == 126
            ? 4
            : ( pack == 127
              ? 10
              : 2 ),
    endMask = iniMask + 4,
    masks   = buffer.slice(iniMask, endMask),
    length  = pack < 126
            ? pack
            : buffer.readUIntBE(2, iniMask - 2),
    end     = length + endMask,
    payload = buffer.slice(endMask, end);

    if(buffer.length < end)
      return;

    let msg = '';
    for (let i = 0, m = 0; i < payload.length; i++, m++)
      msg += String.fromCharCode(payload[i] ^ masks[m % 4]);

    msg    = encoding.convert(msg, 'Latin_1').toString();
    buffer = buffer.slice(end);
    yield { msg, buffer };

    // if the data is larger then what is specified, it's likely that two
    // messages has merged.
    if(buffer.length)
      for(const out of this.decode(buffer))
        yield out;
  }
};
