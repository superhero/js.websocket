'use strict';

module.exports = (data) =>
{
  const
  length    = data[1] & 127,
  firstMask = length == 126
            ? 4
            :
            ( length == 127
              ? 10
              : 2 ),
  masks = data.slice(firstMask,firstMask + 4);

  let output = "";
  for (let i = firstMask + 4, m = 0; i < data.length; i++, m++)
    output += String.fromCharCode(data[i] ^ masks[m % 4]);

  return output;
};
