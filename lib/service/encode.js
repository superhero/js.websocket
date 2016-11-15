module.exports = (input) =>
{
  var
  header,
  payload = Buffer.from(input, 'utf8'),
  length  = payload.length;

  if(length <= 125)
  {
    header    = new Buffer(2);
    header[1] = length;
  }
  else if(length <= 65535)
  {
    header    = new Buffer(4);
    header[1] = 126;
    header[2] = (length >> 8) & 255;
    header[3] = (length     ) & 255;
  }
  else
  {
    header    = new Buffer(10);
    header[1] = 127;

    let
    left = length,
    unit = 256;

    for (let i = 9; i > 1; i--)
    {
      header[i] = left % unit;
      left = left / unit;

      if (left == 0)
        break;
    }
  }
  header[0] = 129;
  return Buffer.concat([header, payload], header.length + payload.length);
};
