module.exports = class extends Error
{
  constructor(msg, ...a)
  {
    super(msg || 'invalid websocket handshake', ...a)
    this.code = 'ERR_WEBSOCKET_HANDSHAKE_INVALID'
  }
}
