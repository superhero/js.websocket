describe('controller/server/http', async () =>
{
  const
  expect  = require('chai').expect,
  context = require('mochawesome/addContext'),
  config  =
  {
    server:
    {
      // debug mode
      debug   : false,
      // callback for error messages
      onError : false,
      // callback when connection has closed
      onClose : false,
    },
  }

  let server, client

  beforeEach(function()
  {
    const
    WebsocketServer = require('./server'),
    port = 80
    context(this, {title:'config', value:config})
    server = new WebsocketServer(config.server)
    server.server.listen({ port })
  })

  afterEach(() => server.server.close())

  it('possible to attach a listener', (done) =>
  {
    server.events.on('connected', done)
  })
})
