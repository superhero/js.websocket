# Websocket

Licence: [MIT](https://opensource.org/licenses/MIT)

---

[![npm version](https://badge.fury.io/js/%40superhero%2Fwebsocket.svg)](https://badge.fury.io/js/%40superhero%2Fwebsocket)

A server/client bundle setup to solve some personal issues I have with other solutions out there.

## Install

`npm install @superhero/websocket`

...or just set the dependency in your `package.json` file:

```json
{
  "dependencies":
  {
    "@superhero/websocket": "*"
  }
}
```

## Example

#### server.js

```javascript
const Websocket = require('@superhero/websocket');
const options   = { debug:true };
const websocket = new Websocket(options);

// listen on port 80
websocket.server.listen({ port:80 });

websocket.events.on('HelloWorld', (ctx, dto) =>
{
  // dto == { 'I':'am','now':'connected' }
  ctx.emit('cool', { 'this':'is','the':'response' });
});

websocket.events.on('¯|_(ツ)_/¯', (ctx, dto) =>
{
  // dto == { 'also':'works' }

  // headers is an object of the request headers sent when connection was
  // established
  console.log(ctx.headers);

  // client ip
  console.log(ctx.socket.remoteAddress);

  // ip family (IPv4 or IPv6)
  console.log(ctx.socket.remoteFamily);

  // numeric representation of the remote port..
  console.log(ctx.socket.remotePort);
});
```

## Options

All options are optional.

```javascript
{
  // debug mode
  debug   : true,

  // callback when connection has closed
  onClose : false
}
```

#### index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Websocket by a Superhero</title>
  </head>

  <body>
    <script data-main="/main" src="//requirejs.org/docs/release/2.2.0/minified/require.js"></script>
  </body>
</html>
```

#### main.js

```javascript
define(
[
  // this "cient" -module is included in this repo. see `client.js` file
  'client'
],
function(client)
{
  var socket = client(
  {
    host  : 'localhost',
    debug : true
  })
  .on('cool', function(dto)
  {
    // dto == { 'this':'is','the':'response' }
    socket.emit('¯|_(ツ)_/¯', { 'also':'works' });
  })
  .on('sup m8', function(dto)
  {
    // dto == undefined
  })
  .connected(function(socket2)
  {
    // `socket` === `socket2`
    // socket2 is however returned through a promise that the socket is
    // connected. attaching listeners does not need this promise, emitting
    // messages however needs a connection to send to.

    // example
    socket2.emit('HelloWorld', { 'I':'am','now':'connected' })
  });
});
```
