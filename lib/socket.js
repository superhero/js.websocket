const
logger = require('@superhero/debug'),
encode = require('./service/encode'),
decode = require('./service/decode'),
keygen = require('./service/accept-key'),
parser = require('./service/parse-request');

module.exports = (options = {}) =>
{
  const
  config =
  {
    host    : options.host    || undefined,
    port    : options.port    || 80,
    debug   : options.debug   || false,
    onError : options.onError || false,
    onClose : options.onClose || false,
    cluster : options.cluster || false
  },
  sockets = [],
  bus     = new class extends require('events') {},
  server  = new require('net').Server(),
  debug   = logger({debug:config.debug}),
  // fuck your reserved key words..
  debugg3r = (context, type) => (...args) =>
  {
    args.length
    ? debug(`${context}: "${type}", arguments:`, args)
    : debug(`${context}: "${type}"`);
  },
  // error observer
  error = (type) => (error) =>
  {
    debug(`${type}: "error", arguments: "${error}"`);
    config.onError && config.onError(error, type);
  },
  // when an event is emitted, this is the handle that is past on as the first
  // argument to the observer listening to that event.
  handleFactory = (socket, headers) =>
  ({
    headers       : headers,
    remoteAddress : socket.remoteAddress,
    remoteFamily  : socket.remoteFamily,
    remotePort    : socket.remotePort,

    emit: (event, data, gl0bal = false) =>
    {
      const
      dto = JSON.stringify({event:event, data:data}),
      enc = encode(dto);

      (gl0bal ? sockets : [socket]).forEach(
        (socket) => setImmediate(
          ()     => socket.write(Buffer.from(enc, 'utf8'),
            ()   => debug(`emitted: "${event}", global: "${gl0bal}"`, data))));
    }
  });

  // ping pong to kep the connection alive
  bus.on('ping', (socket) => socket.emit('pong'));

  // forwarding error messages to be handled by the error observer
  server.on('error', error('server'));

  // adding debug observers for the server events
  config.debug && ['close','connection','listening'].forEach((event) =>
  {
    server.on(event, debugg3r('server', event));
  });

  // setting up the server
  server.listen(
  {
    host      :  config.host,
    port      :  config.port,
    exclusive : !config.cluster
  });

  // each new connection gets stored in the collection and configured
  server.on('connection', (socket) =>
  {
    sockets.push(socket);

    config.debug
    && ['close','connection','drain','end',
        'lookup','timeout'].forEach((event) =>
    {
      socket.on(event, debugg3r('socket', event));
    });

    socket.on('error', error('socket'));
    socket.once('data', (chunk) =>
    {
      // set data listener for all the following requests
      socket.on('data', (chunk) =>
      {
        // messages can come in multiple chunks that needs to be glued together
        try
        {
          for(const msg of decode(chunk))
          {
            // well, this works.. but I have no clue why, the specifications
            // states [0xFF][0x00]. Or if older protocol: [0x00][message][0xFF]
            if(msg.length == 2
            && msg.charCodeAt(0) == 3
            && msg.charCodeAt(1) == 233)
            {
              setImmediate(() => socket.destroy());
            }
            else
            {
              debug('recived message', msg);
              const dto = JSON.parse(msg);
              setImmediate(() => bus.emit(dto.event, handle, dto.data));
            }
          }
        }
        catch(e)
        {
          debug('request could not be resolved');
        }
      });

      socket.on('close', () =>
      {
        sockets.splice(sockets.indexOf(socket), 1);
        config.onClose && config.onClose(handle);
      });

      const
      request = parser(chunk),
      key     = keygen(request.headers['Sec-WebSocket-Key']),
      handle  = handleFactory(socket, request.headers);

      // handshake
      socket.write(
      [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: WebSocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Accept: ' + key
      ].join('\r\n') + '\r\n\r\n');
    });
  });

  return bus;
};
