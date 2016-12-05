const encoding = require('encoding');
module.exports = function* decode(data)
{
  const
  pack    = data[1] & 127,
  iniMask = pack == 126
          ? 4
          : ( pack == 127
            ? 10
            : 2 ),
  endMask = iniMask + 4,
  masks   = data.slice(iniMask, endMask),
  length  = pack < 126
          ? pack
          : data.readUIntBE(2, iniMask - 2),
  end     = length + endMask,
  payload = data.slice(endMask, end);

  let output = '';
  for (let i = 0, m = 0; i < payload.length; i++, m++)
    output += String.fromCharCode(payload[i] ^ masks[m % 4]);

  yield encoding.convert(output, 'Latin_1').toString();

  // if the data is larger then what is specified, it's likely that two
  // messages has merged.
  if(end < data.length)
    for(const out of decode(data.slice(end)))
      yield out;
};
