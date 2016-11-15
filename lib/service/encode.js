/*
const encoding = require('encoding');
module.exports = (input) =>
{
  input = encoding.convert(input, 'Latin_1').toString('base64');

  let out = [129];

  if (input.length <= 125)
    out[1] = input.length;

  else if (input.length >= 126 && input.length <= 65535)
  {
    out[1] = 126;
    out[2] = (input.length >> 8) & 255;
    out[3] = (input.length     ) & 255;
  }
  else
  {
    out[1] = 127;
    out[2] = (input.length >> 56) & 255;
    out[3] = (input.length >> 48) & 255;
    out[4] = (input.length >> 40) & 255;
    out[5] = (input.length >> 32) & 255;
    out[6] = (input.length >> 24) & 255;
    out[7] = (input.length >> 16) & 255;
    out[8] = (input.length >>  8) & 255;
    out[9] = (input.length      ) & 255;
  }

  for (var i = 0; i < input.length; i++)
    out.push(input.charCodeAt(i));

  return out;
};
*/

module.exports = (input) =>
{
  var header;
  var payload = new Buffer(input, 'utf8');
  var len = payload.length;
  if (len <= 125)
  {
    header = new Buffer(2);
    header[1] = len;
  }
  else if (len <= 0xffff)
  {
    header = new Buffer(4);
    header[1] = 126;
    header[2] = (len >> 8) & 0xff;
    header[3] = len & 0xff;
  }
  else // 0xffff < len <= 2^63
  {
    header = new Buffer(10);
    header[1] = 127;
    header[2] = (len >> 56) & 0xff;
    header[3] = (len >> 48) & 0xff;
    header[4] = (len >> 40) & 0xff;
    header[5] = (len >> 32) & 0xff;
    header[6] = (len >> 24) & 0xff;
    header[7] = (len >> 16) & 0xff;
    header[8] = (len >> 8) & 0xff;
    header[9] = len & 0xff;
  }
  header[0] = 0x81;
  return Buffer.concat([header, payload], header.length + payload.length);
};
