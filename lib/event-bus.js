const bus = module.exports = new class extends require('events') {};

// ping pong to kep the connection alive
bus.on('ping', (socket) => socket.emit('pong'));
