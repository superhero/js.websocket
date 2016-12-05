module.exports = (input) =>
{
  let header;

  const
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

    const unit = 256;
    for(let i = 9, left = length; i > 1 && left > 0; i--)
    {
      header[i] = left % unit;
      left /= unit;
    }
  }
  header[0] = 129;
  return Buffer.concat([header, payload], header.length + payload.length);
};
