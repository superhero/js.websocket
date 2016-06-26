'use strict';

module.exports = (buffer) =>
{
  buffer = buffer.toString();

  // seperating the different parts of the request
  const
  separator = buffer.indexOf('\r\n\r\n'),
  header    = buffer.substring(0, separator).split('\r\n'),
  body      = buffer.substring(separator + 4);

  // removing first row of the header
  header.shift();

  // storing all headers in a key object
  let headers = {};
  header.forEach((row) =>
  {
    const parts = row.split(':');
    headers[parts[0].trim()] = parts[1].trim();
  });

  // returning the parsed request
  return {headers:headers, body:body};
};

