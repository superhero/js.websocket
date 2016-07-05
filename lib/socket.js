'use strict';

module.exports = (options) =>
{
  const
  sockets   = [],
  bus       = new class extends require('events') {},
  server    = new require('net').Server(),
  debug     = (msg) => config.debug && console.log('debug:', msg),
  // fuck your reserved key words..
  debugg3r  = (context, type) => (...args) =>
  {
    args.length
    ? debug(`${context}: "${type}", arguments: "${args}"`)
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
  emitter = (socket) =>
  ({
    emit: (eventName, data, gl0bal = false) =>
    {
      const response  = require('./service/encode')
                        (JSON.stringify(
                        {
                          event : eventName,
                          data  : data
                        }));

      (gl0bal ? sockets : [socket]).forEach((socket) =>
      {
        setImmediate(
          () => socket.write(Buffer.from(response, 'utf8'),
            () => debug(`emitted: "${eventName}", global: "${gl0bal}"`)));
      });
    }
  }),
  // the config options and the defaults
  config =
  {
    host    : options.host    || undefined,
    port    : options.port    || 80,
    timeout : options.timeout || 0,
    debug   : options.debug   || false,
    onError : options.onError || false,
    onClose : options.onClose || false,
    cluster : options.cluster || false
  };

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
    const emitService = emitter(socket);
    sockets.push(socket);

    config.debug
    && ['close','connection','drain','end',
        'lookup','timeout'].forEach((event) =>
    {
      socket.on(event, debugg3r('socket', event));
    });

    socket.setTimeout(config.timeout);
    socket.on('error', error('socket'));
    socket.on('close', () =>
    {
      sockets.splice(sockets.indexOf(socket), 1);
      config.onClose && config.onClose(emitService);
    });
    socket.once('data', (buffer) =>
    {
      // set data listener for all the following requests
      socket.on('data', (buffer) =>
      {
        try
        {
          for(const msg of require('./service/decode')(buffer))
          {
            debug(`recived message: ${msg}`);

            // well, this works.. but I have no clue how, the soecifications
            // states [0xFF][0x00]. Or if older protocol: [0x00][message][0xFF]
            if(msg.length == 2
            && msg.charCodeAt(0) == 3
            && msg.charCodeAt(1) == 233)
            {
              setImmediate(() => socket.end());
            }
            else
            {
              const dto = JSON.parse(msg);
              setImmediate(() => bus.emit(dto.event, emitService, dto.data));
            }
          }
        }
        catch(e)
        {
          debug('a request could not be resolved');
        }
      });

      // accept key
      const
      request = require('./service/parse-request')(buffer),
      keygen  = require('./service/accept-key'),
      key     = keygen(request.headers['Sec-WebSocket-Key']);

      // handshake
      socket.write(
      [
        'HTTP/1.1 101',
        'Upgrade: websocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Accept: ' + key
      ].join('\r\n') + '\r\n\r\n');
    });
  });

  return bus;
};
