# Websocket

Licence: [Do What The Fuck You Want To Public License (WTFPL)](http://www.wtfpl.net/about/).

---

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
    // dto == {'this':'is','the':'response'}
    socket.emit('¯|_(ツ)_/¯', {'also':'works'});
  })
  .on('SupM8', function(dto)
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
    socket2.emit('HelloWorld', {'I':'am','now':'connected'})
  });
});
```

#### server.js

```javascript
const bus = require('@superhero/websocket')(
{
  port  : 80,
  debug : true
});

bus.on('connected', (socket) =>
{
  // The connected event is triggered once the client is connected
  socket.emit('SupM8');
});

bus.on('HelloWorld', (socket, dto) =>
{
  // dto == {'I':'am','now':'connected'}
  socket.emit('cool', {'this':'is','the':'response'});
});

bus.on('¯|_(ツ)_/¯', (socket, dto) =>
{
  // dto == {'also':'works'}
});
```
