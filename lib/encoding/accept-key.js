const
crypto = require('crypto'),
guid   = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// @link https://tools.ietf.org/html/rfc6455#page-6
module.exports = (key) =>
  crypto.createHash('sha1').update(key + guid).digest('base64');
