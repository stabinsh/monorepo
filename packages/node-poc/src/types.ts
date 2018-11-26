export interface IMessagingService {
  emit(eventName: string, data: any);
  on(eventName: string, callback: Function);
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
