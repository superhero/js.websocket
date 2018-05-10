const expect = require('chai').expect

describe('codec tests', () =>
{
  const Codec = require('./codec')

  it('expect guid to be the corect constant',
  () => expect(Codec.GUID).to.be.equal('258EAFA5-E914-47DA-95CA-C5AB0DC85B11'))

  it('possible to decode an encoded string', (done) =>
  {
    const
    original = 'foobar',
    encoded  = Codec.encode(original)

    for(const decoded of Codec.decode(encoded))
    {
      expect(decoded.msg).to.be.equal(original)
      done()
    }
  })

  it('possible to decode an encoded string with mask', (done) =>
  {
    const
    original = 'foobar',
    masked   = true,
    encoded  = Codec.encode(original, masked)

    for(const decoded of Codec.decode(encoded))
    {
      expect(decoded.msg).to.be.equal(original)
      done()
    }
  })

  it('buffer is empty after processed complete message', (done) =>
  {
    const
    original = 'foobar',
    encoded  = Codec.encode(original)

    for(const decoded of Codec.decode(encoded))
    {
      expect(decoded.buffer.length).to.be.equal(0)
      done()
    }
  })
})

describe('server setup tests', () =>
{
  let server

  it('possible for the server to listen to a port', (done) =>
  {
    const WebsocketServer = require('./server')
    server = new WebsocketServer({ debug:false })
    server.server.on('listening', done)
    server.server.listen({ port:9001 })
  })

  it('possible to close the server connection', (done) =>
  {
    server.server.on('close', done)
    server.server.close()
  })
})

describe('client setup tests', () =>
{
  let client, server

  it('possible for the client to connect to the server', (done) =>
  {
    const
    WebsocketClient = require('./client'),
    WebsocketServer = require('./server'),
    port = 9001
    // let
    client = new WebsocketClient({ debug:false })
    server = new WebsocketServer({ debug:false })
    server.server.on('listening', async () =>
    {
      await client.connect(port)
      done()
    })
    server.server.listen({ port })
  })

  it('possible to close the client connection', (done) =>
  {
    client.socket.on('close', done)
    client.socket.end()
  })

  after(() => server.server.close())
})

describe('integration tests', () =>
{
  let client, server

  beforeEach((done) =>
  {
    const
    WebsocketClient = require('./client'),
    WebsocketServer = require('./server'),
    port = 9001
    // let
    server = new WebsocketServer({ debug:false })
    client = new WebsocketClient({ debug:false })
    server.server.listen({ port })
    server.server.on('listening', async () =>
    {
      await client.connect(port)
      done()
    })
  })

  afterEach(() =>
  {
    client.socket.end()
    server.server.close()
  })

  it('not possible to emit an event that is not a string', () =>
  {
    expect(client.emit.bind(client, []  )).to.throw(TypeError)
    expect(client.emit.bind(client, {}  )).to.throw(TypeError)
    expect(client.emit.bind(client, 1234)).to.throw(TypeError)
    expect(client.emit.bind(client, null)).to.throw(TypeError)
  })

  it('possible to emit an event from the client to the server', (done) =>
  {
    const
    evt = 'foo',
    dto = 'bar'
    server.events.on(evt, (ctx, data) =>
    {
      expect(data).to.be.equal(dto)
      done()
    })
    client.emit(evt, dto)
  })

  it('possible to emit less then 125 char message', (done) =>
  {
    const
    evt1 = 'foo',
    evt2 = 'bar',
    dto1 = 'baz',
    dto2 = 'qux'
    server.events.on(evt1, (ctx, dto) =>
    {
      expect(dto).to.be.equal(dto1)
      ctx.emit(evt2, dto2)
    })
    client.events.on(evt2, (dto) =>
    {
      expect(dto).to.be.equal(dto2)
      done()
    })
    client.emit(evt1, dto1)
  })

  it('possible to emit a message larger then 125 and less then 65535', () =>
  {
    const
    evt1 = 'foo'.repeat(125),
    evt2 = 'bar'.repeat(125),
    dto1 = 'baz'.repeat(125),
    dto2 = 'qux'.repeat(125)
    server.events.on(evt1, (ctx, dto) =>
    {
      expect(dto).to.be.equal(dto1)
      ctx.emit(evt2, dto2)
    })
    client.events.on(evt2, (dto) =>
    {
      expect(dto).to.be.equal(dto2)
      done()
    })
    client.emit(evt1, dto1)
  })

  it('possible to emit a message larger then 65535 chars', () =>
  {
    const
    evt1 = 'foo'.repeat(13107),
    evt2 = 'bar'.repeat(13107),
    dto1 = 'baz'.repeat(13107),
    dto2 = 'qux'.repeat(13107)
    server.events.on(evt1, (ctx, dto) =>
    {
      expect(dto).to.be.equal(dto1)
      ctx.emit(evt2, dto2)
    })
    client.events.on(evt2, (dto) =>
    {
      expect(dto).to.be.equal(dto2)
      done()
    })
    client.emit(evt1, dto1)
  })
})
