const
encoding  = require('encoding'),
crypto    = require('crypto'),
debug     = require('@superhero/debug'),
Server    = require('net').Server,
Events    = require('events');

module.exports = class
{
  constructor(options)
  {
    this.config = Object.assign(
    {
      debug   : true,
      onError : false,
      onClose : false
    }, options);

    this.guid     = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
    this.log      = debug({debug:this.config.debug});
    this.events   = new Events();
    this.server   = new Server();
    this.sockets  = [];

    // ping-pong to keep the connection alive
    this.events.on('ping', (socket) => socket.emit('pong'));

    for(let event of ['close','connection','listening','error'])
      this.server.on(event, this.log.bind(null, 'server:', event));

    this.server.on('connection', this.onConnection);
  }

  onConnection(socket)
  {
    this.sockets.push(socket);

    for(let event of ['close','connection','drain','end','lookup','timeout','error'])
      socket.on(event, this.log.bind(null, 'socket:', event));

    socket.emit = this.emit.bind(null, socket);

    socket.on('data',  this.onData.bind(null, socket));
    socket.on('close', this.onClose.bind(null, socket));
  }

  onData(socket, data)
  {
    // messages can come in multiple chunks that needs to be glued together
    socket.buffer = Buffer.concat([socket.buffer, data]);

    if(!socket.headers)
      this.handshake(socket);

    if(socket.headers)
      this.dispatch(socket);
  }

  onClose(socket)
  {
    this.sockets.splice(this.sockets.indexOf(socket), 1);
    this.config.onClose && this.config.onClose(socket);
  }

  handshake(socket)
  {
    const s = socket.buffer.toString();
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

      socket.headers  = headers;
      socket.buffer   = Buffer.from(buffer);

      // write headers back to the client and establish a handshake
      socket.write(
      [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: WebSocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Accept: ' + this.keygen(headers['Sec-WebSocket-Key'])
      ].join('\r\n') + '\r\n\r\n');
    }
  }

  dispatch(socket)
  {
    try
    {
      // messages can also come in the same chunk that needs to be divided...
      for(const msg of this.decode(socket.buffer))
      {
        // destroys the socket if specific 2 bytes
        // well, this works.. but I have no clue why, the specifications
        // states [0xFF][0x00]. Or if older protocol: [0x00][message][0xFF]
        if(msg.length == 2
        &&(msg.charCodeAt(0) == 3 && msg.charCodeAt(1) == 233)
        ||(msg.charCodeAt(0) == 3 && msg.charCodeAt(1) == 65533))
        {
          this.log('destroyed the socket connection');
          socket.destroy();
          break;
        }
        else
        {
          const dto = JSON.parse(msg);
          this.log('recived message:', dto);
          this.events.emit(dto.event, socket, dto.data);
        }
      }
      // clear cache once all messages has been parsed
      socket.buffer = Buffer.from('');
    }
    catch(e)
    {
      this.log('a request could not be resolved');
    }
  }

  emit(socket, event, data, toAll)
  {
    this.log('emitting, to everyone:', !!toAll, 'event:', event, 'data:', data);

    const encoded = this.encode(JSON.stringify({event, data}));

    for(let _socket of (toAll ? this.sockets : [socket]))
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

  * decode(data)
  {
    const
    pack    = data[1] & 127,
    iniMask = pack == 126
            ? 4
            : ( pack == 127
              ? 10
              : 2 ),
    endMask = iniMask + 4,
    masks   = data.slice(iniMask, endMask),
    length  = pack < 126
            ? pack
            : data.readUIntBE(2, iniMask - 2),
    end     = length + endMask,
    payload = data.slice(endMask, end);

    let output = '';
    for (let i = 0, m = 0; i < payload.length; i++, m++)
      output += String.fromCharCode(payload[i] ^ masks[m % 4]);

    yield encoding.convert(output, 'Latin_1').toString();

    // if the data is larger then what is specified, it's likely that two
    // messages has merged.
    if(end < data.length)
      for(const out of this.decode(data.slice(end)))
        yield out;
  }
};
