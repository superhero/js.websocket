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
  end     =(data.slice(2, iniMask).reduce((a,b) => a+b, 0) || pack) + endMask,
  payload = data.slice(endMask, end);

  let output = '';
  for (let i = 0, m = 0; i < payload.length; i++, m++)
    output += String.fromCharCode(payload[i] ^ masks[m % 4]);

  yield output;

  // if the data is larger then what is specified, it's likely that two
  // messages has merged.
  if(end < data.length)
    for(const out of decode(data.slice(end)))
      yield out;
};
