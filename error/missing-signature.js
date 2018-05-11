module.exports = class extends Error
{
  constructor(msg, ...a)
  {
    super(msg || 'missing "Sec-WebSocket-Accept" header', ...a)
    this.code = 'ERR_WEBSOCKET_HANDSHAKE_MISSING_SIGNATURE'
  }
}
