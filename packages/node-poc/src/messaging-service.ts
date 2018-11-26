import EventEmitter from "eventemitter3";

import { IMessagingService } from "./types";

export default abstract class MessagingService implements IMessagingService {
  protected eventEmitter: EventEmitter;

  constructor() {
    this.eventEmitter = new EventEmitter();
  }

  on(eventName, callback) {
    this.eventEmitter.on(eventName, callback);
  }

  once(eventName, callback) {
    this.eventEmitter.once(eventName, callback);
  }

  abstract emit(eventName, data);
}
