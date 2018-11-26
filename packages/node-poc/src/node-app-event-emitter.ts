// tslint:disable-next-line:import-name
import EventEmitter from "eventemitter3";

import { IMessagingService } from "./types";

export default class NodeAppEventEmitter {
  messagingService: IMessagingService;
  eventEmitter: EventEmitter;
  appID: string;
  userAddress: string;
  ready: boolean;
  messageQueue: any[];

  constructor(messagingService, userAddress, appID) {
    this.messagingService = messagingService;
    this.eventEmitter = new EventEmitter();
    this.appID = appID;
    this.userAddress = userAddress;
    this.ready = false;
    this.messageQueue = [];

    this.messagingService.on("message", eventData => {
      if (!this.isMessageForUs(eventData)) {
        return;
      }

      if (!this.ready) {
        this.messageQueue.push(eventData);
      } else {
        this.eventEmitter.emit("message", eventData);
      }
    });
  }

  isMessageForUs(eventData) {
    // Pick-up here: because ClientActionMessage uses "toAddress"
    // instead of "peerAddress".
    return (
      this.userAddress === eventData.peerAddress ||
      this.appID ===
        (eventData.appDefinition && eventData.appDefinition.address)
    );
  }

  emit(eventName, data) {
    if (data.type === "ready") {
      this.ready = true;
      this.messageQueue.forEach(message => {
        this.eventEmitter.emit("message", message);
      });
      this.messageQueue = [];
    } else {
      this.messagingService.emit(eventName, data);
    }
  }

  on(eventName, callback) {
    this.eventEmitter.on(eventName, callback);
  }

  once(eventName, callback) {
    this.eventEmitter.once(eventName, callback);
  }
}
