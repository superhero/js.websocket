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

## Browser › Example

#### `server.js`

```javascript
const Websocket = require('@superhero/websocket')
const options   = { debug:true }
const websocket = new Websocket(options)

// listen on port 80
websocket.server.listen({ port:80 })

websocket.events.on('HelloWorld', (ctx, dto) =>
{
  // dto == { 'I':'am','now':'connected' }
  ctx.emit('sup m8', { 'this':'is','the':'response' })
})

websocket.events.on('¯|_(ツ)_/¯', (ctx, dto) =>
{
  // dto == { 'also':'works' }

  // headers is an object of the request headers sent when connection was
  // established
  console.log(ctx.headers)

  // client ip
  console.log(ctx.socket.remoteAddress)

  // ip family (IPv4 or IPv6)
  console.log(ctx.socket.remoteFamily)

  // numeric representation of the remote port..
  console.log(ctx.socket.remotePort)
})
```

#### `index.html`

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

#### `main.js`

```javascript
define(
[
  // this "cient" -module is included in this repo. see `client.browser.js` file
  'client'
],
function(client)
{
  var socket = client(
  {
    host  : 'localhost',
    debug : true
  })
  .on('sup m8', function(dto)
  {
    // dto == { 'this':'is','the':'response' }
    socket.emit('¯|_(ツ)_/¯', { 'also':'works' })
  })
  .connected(function(socket2)
  {
    // `socket` === `socket2`
    // socket2 is however returned through a promise that the socket is
    // connected. attaching listeners does not need this promise, emitting
    // messages however needs a connection to send to.

    // example
    socket2.emit('HelloWorld', { 'I':'am','now':'connected' })
  })
})
```

## Server › Example

The module has both a server and a client. So you can use the module for a
server to server connection, *for what ever reason you now want to do that...*

```js
const WebsocketServer = require('@superhero/websocket')
const WebsocketClient = require('@superhero/websocket/client')

const server = new WebsocketServer()
const client = new WebsocketClient()

const evt1 = 'foo'
const evt2 = 'bar'
const dto1 = 'baz'
const dto2 = 'qux'

const port = 9001

server.server.listen({ port })
server.server.on('listening', async () =>
{
  await client.connect(port)
  client.emit(evt1, dto1)
})

server.events.on(evt1, (ctx, dto) =>
{
  // dto === 'baz'
  ctx.emit(evt2, dto2)
})

client.events.on(evt2, (dto) =>
{
  // dto === 'qux'
})
```
