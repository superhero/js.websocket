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
      socket.emit('bar', {msg:'Hello World'});
    });
  });
});
