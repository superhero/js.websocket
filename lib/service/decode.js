'use strict';

module.exports = function* decode(data)
{
  const
  length    = data[1] & 127,
  firstMask = length == 126
            ? 4
            : ( length == 127
              ? 10
              : 2 ),
  endMask   = firstMask + 4,
  masks     = data.slice(firstMask, endMask),
  payload   = data.slice(0, endMask + length);

  let output = '';
  for (let i = endMask, m = 0; i < payload.length; i++, m++)
    output += String.fromCharCode(payload[i] ^ masks[m % 4]);

  yield output;

  if(endMask + length < data.length)
    for(const out of decode(data.slice(payload.length)))
      yield out;
};
