# Socket v0.1.0

## Websocket

A server/client bundle setup to solve some personal issues I have with other solutions out there.
The current version is very young. The project is setup for me to be able to work on the project and reference it.

### Example

#### index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Websocket example</title>
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
  'socket.client.js'
],
function(socket)
{
  socket(
  {
    host  : 'localhost',
    debug : true
  },
  function(socket)
  {
    socket.on('foo', function(dto)
    {
      dto.msg == 'Hello' && socket.emit('bar', {msg:'World'});
    });
  });
});
```

#### server.js

```javascript
const bus = require('socket')(
{
  port  : 80,
  debug : true
});

bus.on('connected', (socket) =>
{
  socket.emit('foo', {msg:'Hello'});
});

bus.on('bar', (socket, dto) =>
{
  // dto.msg == 'World'
});
```
