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
