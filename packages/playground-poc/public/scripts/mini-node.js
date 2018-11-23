class Node {
  constructor(messagingService, userAddress) {
    this.messagingService = messagingService;
    this.eventEmitters = {};

    this.messagingService.emit('identity', { address: userAddress });
  }

  openApp(appID) {
    const eventEmitter = new EventEmitter3.EventEmitter();

    eventEmitter.on('message', (eventData) => {
      this.messagingService.emit('message', eventData);
    });

    this.messagingService.on('message', (eventData) => {
      eventEmitter.emit('message', eventData);
    });

    this.eventEmitters[appID] = (this.eventEmitters[appID] || []).concat([eventEmitter]);
    return eventEmitter;
  }

  on(event, callback) {
    this.messagingService.on('message', (data) => {
      if (data.type === event) {
        callback(data);
      }
    });
  }
}
