export interface IMessagingService {
  on(eventName: string, callback: Function);
  once(eventName: string, callback: Function);
  emit(eventName: string, data: any);
}

export interface IStore {
  setCommitment(): void;
  incomingMessage(): void;
  getTransaction(): void;
  getAppCount(): void;
  appExists(): void;
  appHasCommitments(): void;
}

export interface IInputOutput {
  receiveMessageFromPeer(): void;
  findMessage(): void;
  listenOnce(): void;
  ioSendMessage(internalMessage, next, context): void;
  waitForIo(): void;
  ackMethod: Function;
}
