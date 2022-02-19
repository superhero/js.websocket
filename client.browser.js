class WebSocketStream
{
  constructor(options)
  {
    this.onConnectedActions = []
    this.observers          = {}
    this.options            = 
    {
      protocol    : 'protocol'    in options ? options.protocol    : 'ws',
      host        : 'host'        in options ? options.host        : '127.0.0.1',
      port        : 'port'        in options ? options.port        : 80,
      silent      : 'silent'      in options ? options.debug       : false,
      keepalive   : 'keepalive'   in options ? options.debug       : 25000,
      reconnect   : 'reconnect'   in options ? options.reconnect   : true,
      onClose     : 'onClose'     in options ? options.onClose     : false,
      onConnect   : 'onConnect'   in options ? options.onConnect   : false,
      onReconnect : 'onReconnect' in options ? options.onReconnect : false
    }
  }

  connect(reconnecting = false)
  {
    const url = this.options.protocol + '://' + this.options.host + ':' + this.options.port

    this.websocket = new WebSocket(url)

    this.log('websocket instantiated', url)

    this.websocket.onopen = (event) =>
    {
      this.connected = true

      this.log('websocket opened', event)

      this.keepaliveInterval = setInterval(() => this.emit('ping'), this.options.keepalive)

      this.log('websocket keepalive is set', Math.round(this.options.keepalive / 1e3) + 's')

      reconnecting
      ? this.options.onReconnect && this.options.onReconnect(event)
      : this.options.onConnect   && this.options.onConnect(event)

      for(const action of this.onConnectedActions)
      {
        action(event)
      }
    }

    this.websocket.onerror = (event) =>
    {
      this.log('websocket error', event)
    }

    this.websocket.onclose = (event) =>
    {
      this.connected = false

      this.log('websocket closed', event)

      clearInterval(this.keepaliveInterval)

      this.log('websocket keepalive interval stopped')

      this.options.onClose    && this.options.onClose()
      this.options.reconnect  && setTimeout(this.connect.bind(this), 100, true)
    }

    this.websocket.onmessage = (event) =>
    {
      this.log('websocket message recieved', event)

      const dto = JSON.parse(event.data)

      this.log('websocket parsed message data', dto)

      this.trigger(dto.event, dto.data)

      this.log('websocket triggered event', dto.event)
    }
  }

  log(...args)
  {
    this.options.silent == false
    && window.console
    && window.console.log
    && window.console.log(Date.now(), ...args)
  }

  onConnectedAction(action)
  {
    this.onConnectedActions.push(action)
    this.log('websocket added an "on connected action"')
    this.connected && action()
  }

  emit(eventname, data)
  {
    const dto =
    {
      event : eventname,
      data  : data
    }
    this.websocket.send(JSON.stringify(dto))
    this.log('websocket emitted message', dto)
  }

  on(eventname, observer)
  {
    if(this.observers[eventname] === undefined)
    {
      this.observers[eventname] = []
    }
    this.observers[eventname].push(observer)
    this.log('websocket added observer', eventname)
  }

  removeObserver(eventname, observer)
  {
    this.log('websocket removing observer', eventname)
    if(this.observers[eventname] === undefined)
    {
      return
    }
    const index = this.observers[eventname].indexOf(observer)
    ~index && this.observers[eventname].splice(index, 1)
  }

  trigger(eventname, data)
  {
    for(const observer of this.observers[eventname] || [])
    {
      observer(data)
    }
  }

  close()
  {
    this.options.reconnect = false
    this.log('websocket reconnect disabled')
    this.log('websocket requested to close connection')
    this.websocket.close()
  }
}