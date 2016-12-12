const
logger = require('@superhero/debug'),
encode = require('./encoding/encode'),
decode = require('./encoding/decode'),
events = require('./event-bus'),
keygen = require('./accept-key');

module.exports = (options = {}) =>
{
  const
  config = Object.assign(
  {
    host    : undefined,
    port    : 80,
    debug   : false,
    onError : false,
    onClose : false,
    cluster : false
  }, options),
  sockets = [],
  server  = new require('net').Server(),
  debug   = logger({debug:config.debug}),
  error   = (type) => (error) =>
  {
    debug(`${type}: "error", arguments: "${error}"`);
    config.onError && config.onError(error, type);
  };

  // ping pong to kep the connection alive
  events.on('ping', (socket) => socket.emit('pong'));

  // forwarding error messages to be handled by the error observer
  server.on('error', error('server'));

  // adding debug observers for the server events
  ['close','connection','listening'].forEach((event) =>
    server.on(event, () => debug('server:', `"${event}"`)));

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

    ['close','connection','drain','end','lookup','timeout'].forEach((event) =>
      socket.on(event, () => debug('socket:', `"${event}"`)));

    socket.on('error', error('socket'));
    socket.once('data', (headers) =>
    {
      // parsing header
      headers = headers.toString().split('\r\n\r\n').shift().split('\r\n');
      headers = headers.map(row => row.split(':').map(item => item.trim()));
      headers = headers.reduce((obj, header) =>
      {
        obj[header[0]] = header[1];
        return obj;
      }, {});

      // set data listener for all the following requests
      let dataCache = Buffer.from('');
      socket.on('data', (chunk) =>
      {
        try
        {
          // messages can come in multiple chunks that needs to be glued together
          dataCache = Buffer.concat([dataCache, chunk]);
          // messages can also come in the same chunk that needs to be divided...
          for(const msg of decode(dataCache))
          {
            // well, this works.. but I have no clue why, the specifications
            // states [0xFF][0x00]. Or if older protocol: [0x00][message][0xFF]
            if(msg.length == 2
            &&(msg.charCodeAt(0) == 3 && msg.charCodeAt(1) == 233)
            ||(msg.charCodeAt(0) == 3 && msg.charCodeAt(1) == 65533))
            {
              debug('destroyed socket connection');
              return socket.destroy();
            }
            else
            {
              debug('recived message', msg);
              const dto = JSON.parse(msg);
              setImmediate(() => events.emit(dto.event, handle, dto.data));
            }
          }
          // clear cache once all messages has been parsed
          dataCache = Buffer.from('');
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

      // when an event is emitted, this is the handle that is past on as the
      // first argument to the observer listening to that event.
      const handle =
      {
        headers       : headers,
        remoteAddress : socket.remoteAddress,
        remoteFamily  : socket.remoteFamily,
        remotePort    : socket.remotePort,

        emit: (event, data, globaly = false) =>
        {
          const
          dto = JSON.stringify({event:event, data:data}),
          enc = encode(dto);

          (globaly ? sockets : [socket]).forEach(
            (socket) => setImmediate(
              ()     => socket.write(enc, 'binary'),
                ()   => debug(`emitted: "${event}", global: "${globaly}"`, data)));
        }
      };

      // handshake
      socket.write(
      [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: WebSocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Accept: ' + keygen(headers['Sec-WebSocket-Key'])
      ].join('\r\n') + '\r\n\r\n');
    });
  });

  return events;
};
