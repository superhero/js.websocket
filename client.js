define(function()
{
  return function(options, onConnected)
  {
    var
    pid,
    socket,
    observers = {},
    initQueue = [],
    connected = false,
    config    =
    {
      protocol: options.protocol || 'ws',
      host    : options.host     || '127.0.0.1',
      debug   : options.debug    || false,
      onClose : options.onClose  || false
    },
    debug = function(context, data)
    {
      config.debug
      && window.console
      && window.console.log
      && window.console.log(context, data);
    },
    // interface
    face =
    {
      // This method works like a promise, a promise that the connection is
      // established
      connected: function(observer)
      {
        connected
        ? observer(this)
        : initQueue.push(observer);
        return this;
      },

      emit: function(event, data)
      {
        var dto =
        {
          event : event,
          data  : data
        };
        setTimeout(function()
        {
          socket.send(JSON.stringify(dto));
          debug('emitted', dto);
        });
        return this;
      },

      on: function(event, observer)
      {
        if(!observers[event])
          observers[event] = [];

        observer instanceof Function
        && observers[event].push(observer);

        return this;
      },

      trigger: function(event, data)
      {
        (observers[event] || []).forEach(function(obs)
        {
          obs(face, data);
        });
      },

      removeListener: function(event, listener)
      {
        if(!observers[event])
          return this;

        var index = observers[event].indexOf(listener);
        ~index && observers[event].splice(index, 1);
        debug('removed observer', listener);
        return this;
      },

      close: function()
      {
        socket.close();
      }
    };

    // Jump the event queue
    setTimeout(function()
    {
      socket = new WebSocket(config.protocol + '://' + config.host);

      socket.onopen = function(event)
      {
        debug('socket open', event);
        face.emit('connected');
        pid = setInterval(function(){face.emit('ping')}, 25000);

        // this set is used for the init queue (connection promise)
        connected = true;
        onConnected && onConnected();
        var observer;
        while(observer = initQueue.shift())
          observer(face);
      };

      socket.onclose = function(event)
      {
        debug('socket closed', event);
        connected = false;
        clearInterval(pid);
        config.onClose && config.onClose();
      };

      socket.onmessage = function(event)
      {
        debug('socket recived message', event);

        var dto = JSON.parse(event.data);
        face.trigger(dto.event, dto.data);
      };
    });

    return face;
  };
});
