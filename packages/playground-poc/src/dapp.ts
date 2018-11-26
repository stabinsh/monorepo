import EventEmitter from "eventemitter3";

import { IAppManifest } from "./types";

export default class Dapp {
  manifest: IAppManifest;
  eventEmitter: EventEmitter;
  ready: boolean;
  userAddress: string;
  window: Window | null;
  port: MessagePort | null;
  messageQueue: object[];

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

    this.eventEmitter.on("message", message => {
      if (this.port) {
        this.port.postMessage(message);
      } else {
        this.queueMessage(message);
      }
    });
  }

  queueMessage(message) {
    this.messageQueue.push(message);
  }

  flushMessageQueue() {
    this.messageQueue.forEach(
      message => this.port && this.port.postMessage(message)
    );
  }

  bindToWindow(windowObject: Window) {
    this.window = windowObject;
    this.window.addEventListener(
      "message",
      this.configureMessageChannel.bind(this)
    );
    this.window.addEventListener("load", () => {
      this.ready = true;
    });
  }

  configureMessageChannel(event) {
    if (!this.window) {
      return;
    }

    if (event.data === "cf-node-provider:init") {
      const { port2 } = this.configureMessagePorts();
      this.window.postMessage("cf-node-provider:port", "*", [port2]);
    }

    if (event.data === "cf-node-provider:ready") {
      this.flushMessageQueue();
    }
  }

  configureMessagePorts() {
    const channel = new MessageChannel();

    this.port = channel.port1;
    this.port.addEventListener("message", this.relayMessage.bind(this));
    this.port.start();

    return channel;
  }

  relayMessage(event) {
    this.eventEmitter.emit("message", event.data);
  }

  reply(originalMessage, data = {}) {
    const message = Object.assign({}, originalMessage, data);

    message.peerAddress = originalMessage.fromAddress;
    delete message.fromAddress;

    this.eventEmitter.emit("message", message);
  }
}
