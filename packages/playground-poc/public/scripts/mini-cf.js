const uuid = () => {
  //// return uuid of form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  var uuid = '', ii;
  for (ii = 0; ii < 32; ii += 1) {
    switch (ii) {
    case 8:
    case 20:
      uuid += '-';
      uuid += (Math.random() * 16 | 0).toString(16);
      break;
    case 12:
      uuid += '-';
      uuid += '4';
      break;
    case 16:
      uuid += '-';
      uuid += (Math.random() * 4 | 8).toString(16);
      break;
    default:
      uuid += (Math.random() * 16 | 0).toString(16);
    }
  }
  return uuid;
};

class AppFactory {
  constructor(client, appDefinition) {
    /**
     * @type Client
     */
    this.client = client;
    this.appDefinition = appDefinition;
  }

  proposeInstall(peerAddress, terms) {
    this.client.nodeProvider.emit('proposeInstall', {
      peerAddress,
      terms,
      appDefinition: this.appDefinition
    });
  }

  rejectInstall(peerAddress, terms) {
    this.client.nodeProvider.emit('rejectInstall', {
      peerAddress,
      terms,
      appDefinition: this.appDefinition
    });
  }
}

class AppInstance {
  constructor(installData) {
    this.id = uuid();
    this.eventEmitter = new EventEmitter3.EventEmitter();

    this.definition = installData.appDefinition;
    this.terms = installData.terms;
    this.peerAddress = installData.fromAddress;
    this.fromAddress = installData.peerAddress;
    this.manifestUri = `/manifests/${this.definition.address}.manifest`;
  }

  bindEvents(nodeProvider) {
    this.on('proposeState', (eventData) => {
      nodeProvider.emit('proposeState', eventData);
    });

    this.on('acceptState', (eventData) => {
      nodeProvider.emit('acceptState', eventData);
    });

    this.on('rejectState', (eventData) => {
      nodeProvider.emit('rejectState', eventData);
    });
  }

  on(eventName, callback) {
    this.eventEmitter.on(eventName, callback);
  }

  once(eventName, callback) {
    this.eventEmitter.once(eventName, callback);
  }

  proposeState(state) {
    this.eventEmitter.emit('proposeState', {
      peerAddress: this.peerAddress,
      appDefinition: this.definition,
      state: JSON.stringify(state),
    });
  }

  acceptState(state) {
    this.eventEmitter.emit('acceptState', {
      peerAddress: this.peerAddress,
      appDefinition: this.definition,
      state: JSON.stringify(state)
    });
  }

  rejectState(state) {
    this.eventEmitter.emit('rejectState', {
      peerAddress: this.peerAddress,
      appDefinition: this.definition,
      state: JSON.stringify(state)
    });
  }
}

class Client extends EventEmitter3.EventEmitter {
  constructor(nodeProvider) {
    super();

    /**
     * @type NodeProvider
     */
    this.nodeProvider = nodeProvider;
    this.appInstances = {};

    this.bindInstallEvents();
    this.bindStateEvents();
  }

  registerAppInstance(appInstance, appDefinition, peers) {
    this.appInstances[appDefinition.address] = (this.appInstances[appDefinition.address] || []).concat({
      instance: appInstance,
      peers,
    });
  }

  bindInstallEvents() {
    const bubbleEvent = (eventData) => {
      this.emit(eventData.type, eventData);
    };

    this.nodeProvider.on('proposeInstall', bubbleEvent);
    this.nodeProvider.on('rejectInstall', bubbleEvent);

    this.nodeProvider.on('install', (eventData) => {
      const appInstance = new AppInstance(eventData);
      appInstance.bindEvents(this.nodeProvider);
      this.registerAppInstance(appInstance, eventData.appDefinition, [eventData.fromAddress, eventData.toAddress]);
      this.emit(eventData.type, appInstance);
    });
  }

  bindStateEvents() {
    const stateEventDelegate = (eventData) => {
      const appInstance = this.getAppInstance(eventData.appDefinition.address, [eventData.fromAddress, eventData.toAddress]);
      this.emit(eventData.type, appInstance, {}, eventData.state);
    };

    this.nodeProvider.on('proposeState', stateEventDelegate);
    this.nodeProvider.on('acceptState', stateEventDelegate);
    this.nodeProvider.on('rejectState', stateEventDelegate);
  }

  getAppInstance(address, peers) {
    return (this.appInstances[address].find(record => record.peers.every(peer => peers.includes(peer))) || {}).instance;
  }

  createAppFactory(appDefinition) {
    return new AppFactory(this, appDefinition);
  }
}

class NodeProvider {
  constructor() {
    this.eventEmitter = new EventEmitter3.EventEmitter();
  }

  async connect() {
    return new Promise((resolve) => {
      window.addEventListener('message', (event) => {
        if (event.data === 'cf-node-provider:port') {
          this.messagePort = event.ports[0];
          this.messagePort.addEventListener('message', (event) => {
            this.eventEmitter.emit(event.data.type, event.data);
          });
          this.messagePort.start();
          window.postMessage('cf-node-provider:ready');
          this.emit('ready');
          resolve(this);
        }
      });

      window.postMessage('cf-node-provider:init', '*');
    });
  }

  emit(eventName, data) {
    this.messagePort.postMessage({ type: eventName, ...data });
  }

  on(eventName, callback) {
    this.eventEmitter.on(eventName, callback);
  }

  once(eventName, callback) {
    this.eventEmitter.once(eventName, callback);
  }
}

var cf = { Client: Client };

