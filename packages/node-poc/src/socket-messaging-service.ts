import MessagingService from "./messaging-service";

export default class SocketMessagingService extends MessagingService {
  socket: SocketIOClient.Socket;

  constructor(io: SocketIOClientStatic, url: string) {
    super();
    this.socket = io.connect(url);

    this.socket.on("message", eventData => {
      this.eventEmitter.emit("message", eventData);
    });

    this.socket.on("connect", eventData => {
      this.eventEmitter.emit("connect", eventData);
    });
  }

  emit(eventType, data) {
    // if (data.fromAddress && eventType === 'message' && data.type !== 'requestPlayer' && data.type !== 'matchedPlayer' && data.fromAddress === data.peerAddress) {
    //   const call = {};
    //   Error.captureStackTrace(call);
    //   console.warn('WARNING: fromAddress and peerAddress are the same. This could be a feedback loop.',
    //     eventType, data, call.stack.toString().replace(/Error/, ''));
    //   return;
    // }
    this.socket.emit(eventType, data);
  }
}
