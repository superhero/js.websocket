const
encoding  = require('encoding'),
crypto    = require('crypto'),
Debug     = require('@superhero/debug'),
Socket    = require('net').Socket,
Events    = require('events'),
version   = require('./package.json').version,
Codec     = require('./codec')

module.exports = class
{
  constructor(options)
  {
    this.config = Object.assign(
    {
      debug     : true,
      reconnect : false,
      onClose   : false
    }, options)

    const debug = new Debug({ debug:this.config.debug, prefix:'ws client:' })

    this.log    = debug.log.bind(debug)
    this.events = new Events()
    this.socket = new Socket()

    for(let event of ['close','connect','data','drain','end','lookup','ready'])
      this.socket.on(event, () => this.log(event))

    for(let event of ['error'])
      this.socket.on(event, (...a) => this.log(event, ...a))
  }

  get key()
  {
    return this._key
    ? this._key
    : this._key = crypto.randomBytes(15).toString('base64')
  }

  get chunks()
  {
    return this._chunks
    ? this._chunks
    : this._chunks = []
  }

  connect(port = 80, host = '127.0.0.1', headers)
  {
    const header = this.composeHeader(headers)

    return new Promise((fulfill) =>
      this.socket.connect(port, host, () =>
      {
        this.socket.write(header, (error) =>
        {
          if(error)
          {
            throw error
          }
          else
          {
            this.log('handshake:', 'sent')
            this.socket.once('data', (data) => fulfill( this.handshake(data) ))
          }
        })
      }))
  }

  handshake(data)
  {
    return new Promise((fulfill) =>
    {
      this.log('handshake:', 'received')

      const
      headers = data.toString().split('\r\n'),
      foundAcceptHeader = headers.some((line) =>
      {
        if(!line.toLowerCase().startsWith('sec-websocket-accept'))
          return false

        const signature = (line.split(':')[1] || '').trim()

        if(signature === Codec.signature(this.key))
        {
          this.log('handshake:', 'verified')
          this.socket.on('data', this.onData.bind(this))
          fulfill()
        }
        else
        {
          this.log('handshake:', 'invalid:', 'signature:', signature)
          const error = new Error('invalid websocket handshake')
          error.code = 'ERR_WEBSOCKET_HANDSHAKE_INVALID'
          throw error
        }

        return true
      })

      if(!foundAcceptHeader)
      {
        this.log('handshake:', 'missing "Sec-WebSocket-Accept" header')
        const error = new Error('missing "Sec-WebSocket-Accept" header')
        error.code = 'ERR_WEBSOCKET_HANDSHAKE_MISSING_SIGNATURE'
        throw error
      }
    })
  }

  composeHeader(headers = {})
  {
    headers = Object.assign(
      { 'User-Agent' : `Superhero Websocket Client/${version}` },
      headers,
      { 'Sec-WebSocket-Key' : this.key })

    let header = ''

    for(const key in headers)
      header += `${key} : ${headers[key]}\r\n`

    return header + '\r\n'
  }

  onData(buffer)
  {
    this.log('received message')
    buffer = Buffer.concat([this.buffer, buffer].filter(_ => _))
    for(const decoded of Codec.decode(buffer))
    {
      this.buffer = decoded.buffer

      try
      {
        this.chunks.push(decoded.msg)

        const
        msg = this.chunks.join(),
        dto = JSON.parse(msg)

        this.chunks.length = 0
        this.log('received message:', dto)
        this.events.emit(dto.event, dto.data)
      }
      catch(error)
      {
        this.log(error)
        this.log('a message could not be parsed:', this.chunks)
      }
    }
  }

  emit(event, data)
  {
    if(typeof event !== 'string')
      throw new TypeError('event must be a string')

    const
    dto     = JSON.stringify({ event, data }),
    masked  = true,
    encoded = Codec.encode(dto, masked)

    return new Promise((fulfill) =>
      this.socket.write(encoded, () =>
      {
        this.log('emitted:', event, data)
        fulfill()
      }))
  }
}
