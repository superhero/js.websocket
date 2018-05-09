const
crypto    = require('crypto'),
encoding  = require('encoding')

module.exports = Object.freeze(
{
  GUID : '258EAFA5-E914-47DA-95CA-C5AB0DC85B11',

  signature: function(key)
  {
    // https://tools.ietf.org/html/rfc6455#page-6
    return crypto.createHash('sha1').update(key + this.GUID).digest('base64')
  },

  encode : function(data)
  {
    let header

    const
    payload = Buffer.from(data),
    length  = payload.length

    if(length <= 125)
    {
      header    = new Buffer(2)
      header[1] = length
    }
    else if(length <= 65535)
    {
      header    = new Buffer(4)
      header[1] = 126
      header[2] = (length >> 8) & 255
      header[3] = (length     ) & 255
    }
    else
    {
      header    = new Buffer(10)
      header[1] = 127

      const unit = 256
      for(let i = 9, left = length; i > 1 && left > 0; i--)
      {
        header[i] = left % unit
        left /= unit
      }
    }
    header[0] = 129
    return Buffer.concat([header, payload])
  },

  decode : function * (buffer)
  {
    const
    pack    = buffer[1] & 127,
    iniMask = pack == 126
              ? 4
              : ( pack == 127
                ? 10
                : 2 ),
    endMask = buffer[0] & 8
              ? iniMask + 4
              : iniMask,
    masks   = buffer.slice(iniMask, endMask),
    length  = pack < 126
            ? pack
            : buffer.readUIntBE(2, iniMask - 2),
    end     = length + endMask,
    payload = buffer.slice(endMask, end)

    if(buffer.length < end)
      return

    let msg = ''
    for (let i = 0, m = 0; i < payload.length; i++, m++)
      msg += String.fromCharCode(payload[i] ^ masks[m % 4])

    msg    = encoding.convert(msg, 'Latin_1').toString()
    buffer = buffer.slice(end)
    yield { msg, buffer }

    // if the data is larger then what is specified, it's likely that two
    // messages has merged.
    if(buffer.length)
      for(const out of this.decode(buffer))
        yield out
  }
})
