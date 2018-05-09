const
Debug  = require('@superhero/debug'),
Server = require('net').Server,
Events = require('events'),
Codec  = require('./codec')

module.exports = class
{
  constructor(options)
  {
    this.config = Object.assign(
    {
      debug   : true,
      onClose : false
    }, options)

    const debug = new Debug({ debug:this.config.debug, prefix:'ws server:' })

    this.log      = debug.log.bind(debug)
    this.events   = new Events()
    this.server   = new Server()
    this.sockets  = []

    // ping-pong to keep the connection alive
    this.events.on('ping', (socket) => socket.emit('pong'))

    for(let event of ['close','connection','listening'])
      this.server.on(event, () => this.log(event))

    for(let event of ['error'])
      this.server.on(event, (...a) => this.log(event, ...a))

    this.server.on('connection', this.onConnection.bind(this))
  }

  onConnection(socket)
  {
    this.sockets.push(socket)

    for(let event of ['close','connection','drain','end','lookup','timeout'])
      socket.on(event, () => this.log('socket:', event))

    for(let event of ['error'])
      socket.on(event, (...a) => this.log('socket:', event, ...a))

    const ctx   = { socket }
    ctx.emit    = this.emit.bind(this, socket)
    ctx.chunks  = []

    socket.on('data',  this.onData .bind(this, ctx))
    socket.on('close', this.onClose.bind(this, ctx))
  }

  onData(ctx, data)
  {
    this.log('socket:', 'data')

    // messages can come in multiple chunks that needs to be glued together
    ctx.buffer = Buffer.concat([ctx.buffer, data].filter(_ => _))

    if(!ctx.headers)
      this.handshake(ctx)

    if(ctx.headers)
      this.dispatch(ctx)
  }

  onClose(ctx)
  {
    this.sockets.splice(this.sockets.indexOf(ctx.socket), 1)
    this.config.onClose && this.config.onClose(ctx)
  }

  handshake(ctx)
  {
    this.log('socket:', 'handshake:', 'received')
    const s = ctx.buffer.toString()
    if(s.match(/\r\n\r\n/))
    {
      // parse headers and store remaining buffer
      const
      parts     = s.split('\r\n\r\n'),
      rows      = parts.shift().split('\r\n'),
      buffer    = parts.join(''),
      divided   = rows.map((row) => row.split(':').map((item) => item.trim())),
      headers   = divided.reduce((obj, header) =>
      {
        obj[header[0].toLowerCase()] = header[1]
        return obj
      }, {}),
      key       = headers['sec-websocket-key'],
      signature = Codec.signature(key)

      if(!key)
      {
        this.log('socket:', 'handshake:', 'sec-websocket-key missing')
        ctx.socket.destroy()
        return
      }

      if(key.length < 10)
      {
        this.log('socket:', 'handshake:', 'sec-websocket-key to short', key)
        socket.destroy()
        return
      }

      this.log('socket:', 'handshake:', 'received:', 'key:', key)

      ctx.headers = headers
      ctx.buffer  = Buffer.from(buffer)

      // write headers back to the client and establish a handshake
      ctx.socket.write(
      [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: WebSocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Accept: ' + signature
      ].join('\r\n') + '\r\n\r\n',
      () => this.log('socket:', 'handshake:', 'sent:', 'signature:', signature))
    }
    else
    {
      this.log('socket:', 'handshake:', 'header incomplete')
    }
  }

  dispatch(ctx)
  {
    // messages can also come in the same chunk that needs to be divided...
    for(const decoded of Codec.decode(ctx.buffer))
    {
      ctx.buffer = decoded.buffer

      // destroys the socket if specific 2 bytes
      // well, this works.. but I have no clue why, the specifications
      // states [0xFF][0x00]. Or if older protocol: [0x00][message][0xFF]
      if(decoded.msg.length == 2
      &&(decoded.msg.charCodeAt(0) == 3 && decoded.msg.charCodeAt(1) == 233)
      ||(decoded.msg.charCodeAt(0) == 3 && decoded.msg.charCodeAt(1) == 65533))
      {
        ctx.socket.destroy()
        break
      }
      else
      {
        try
        {
          ctx.chunks.push(decoded.msg)

          const
          msg = ctx.chunks.join(),
          dto = JSON.parse(msg)

          ctx.chunks.length = 0
          this.log('received message:', dto)
          this.events.emit(dto.event, ctx, dto.data)
        }
        catch(error)
        {
          this.log(error)
          this.log('a message could not be parsed:', ctx.chunks)
        }
      }
    }
  }

  emit(socket, event, data, toAll)
  {
    this.log('emitting, to everyone:', !!toAll, 'event:', event, 'data:', data)

    const
    dto     = JSON.stringify({ event, data }),
    encoded = Codec.encode(dto)

    for(let _socket of (toAll ? this.sockets : [socket]))
      setImmediate(() => _socket.write(encoded))
  }
}
