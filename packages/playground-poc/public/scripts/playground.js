class Dapp {
  constructor(manifest, eventEmitter, userAddress) {
    this.manifest = manifest;
    this.eventEmitter = eventEmitter;
    this.ready = false;
    this.userAddress = userAddress;

    /**
     * @type {Window}
     */
    this.window = null;

    /**
     * @type {MessagePort}
     */
    this.port = null;

    this.messageQueue = [];

    this.eventEmitter.on('message', (message) => this.port.postMessage(message));
    this.relayIdentity();
  }

  queueMessage(message) {
    this.messageQueue.push(message);
  }

  flushMessageQueue() {
    this.messageQueue.forEach((message) => this.port.postMessage(message));
  }

  bindToWindow(windowObject) {
    this.window = windowObject;
    this.window.addEventListener('message', this.configureMessageChannel.bind(this));
    this.window.addEventListener('load', () => { this.ready = true; });
  }

  configureMessageChannel(event) {
    if (event.data === 'cf-node-provider:init') {
      const { port2 } = this.configureMessagePorts();
      this.window.postMessage('cf-node-provider:port', '*', [port2]);
    }

    if (event.data === 'cf-node-provider:ready') {
      this.flushMessageQueue();
    }
  }

  configureMessagePorts() {
    const channel = new MessageChannel();

    this.port = channel.port1;
    this.port.addEventListener('message', this.relayMessage.bind(this));
    this.port.start();

    return channel;
  }

  relayMessage(event) {
    this.eventEmitter.emit('message', event.data);
  }

  relayIdentity() {
    this.eventEmitter.emit('identity', { address: this.userAddress });
  }

  reply(originalMessage, data = {}) {
    const message = Object.assign({}, originalMessage, data);

    message.peerAddress = originalMessage.fromAddress;
    delete message.fromAddress;

    this.eventEmitter.emit('message', message);
  }
}

class MessagingService {
  constructor() {
    this.eventEmitter = new EventEmitter3.EventEmitter();
  }

  on(eventName, callback) {
    this.eventEmitter.on(eventName, callback);
  }

  once(eventName, callback) {
    this.eventEmitter.once(eventName, callback);
  }
}

class SocketMessagingService extends MessagingService {
  constructor(url) {
    super();
    this.socket = io.connect(url);

    this.socket.on('message', (eventData) => {
      this.eventEmitter.emit('message', eventData);
    });

    this.socket.on('connect', (eventData) => {
      this.eventEmitter.emit('connect', eventData);
    });
  }

  emit(eventType, data) {
    this.socket.emit(eventType, data);
  }
}

class Playground {
  constructor(appManifests) {
    this.iframes = {};
    this.user = null;
    this.appManifests = appManifests;
  }

  showAppList() {
    Object.keys(this.appManifests).forEach((appID) => {
      const button = document.createElement('button');
      const manifest = this.appManifests[appID];
      button.innerText = manifest.name;
      button.addEventListener('click', () => this.loadApp(manifest, document.body));
      document.getElementById('dapp-list').appendChild(button);
    });
  }

  connectAs(address) {
    this.node = new Node(new SocketMessagingService('http://localhost:8080'), address);
    this.user = address;

    document.getElementById('current-user').innerText = address;

    this.bindEvents();
  }

  bindEvents() {
    this.node.on('proposeInstall', (data) => {
      vex.dialog.confirm({
        message: `Do you want to install ${data.appDefinition.name}?`,
        callback: (value) => {
          if (value) {
            const dapp = this.loadApp(data.appDefinition, document.body);
            dapp.reply(data, { type: 'install' });
          } else {
            const rejectMessage = {
              ...data,
              peerAddress: data.fromAddress,
              type: 'rejectInstall',
            };

            delete rejectMessage.fromAddress;
            this.node.messagingService.emit('message', rejectMessage);
          }
        }
      });
    });

    this.node.on('rejectInstall', (data) => {
      vex.dialog.alert(`${data.fromAddress} rejected your install proposal.`);
    });
  }

  /**
   * @param {manifest} Object
   * @param {Element} parentNode
   */
  loadApp(manifest, parentNode) {
    if (this.iframes[manifest.address]) {
      return this.iframes[manifest.address];
    }

    const iframe = document.createElement('iframe');

    iframe.id = manifest.address;
    iframe.src = manifest.url;

    parentNode.appendChild(iframe);

    const appEventEmitter = this.node.openApp(manifest.address, this.user);
    const dapp = new Dapp(manifest, appEventEmitter, this.user);
    dapp.bindToWindow(iframe.contentWindow);

    this.iframes[iframe.id] = dapp;

    return dapp;
  }
}
