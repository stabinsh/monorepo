import { legacy } from "@counterfactual/cf.js";
import { Context, types } from "@counterfactual/machine";

import { IMessagingService } from "../service-interfaces";

export default class IO {
  constructor(private readonly messagingService: IMessagingService) {
    console.log(this.messagingService);
  }

  ackMethod(msg: legacy.node.ClientActionMessage) {}

  async ioSendMessage(
    internalMessage: types.InternalMessage,
    next: Function,
    context: Context
  ) {}

  async waitForIo(
    message: types.InternalMessage,
    next: Function,
    context: Context
  ): Promise<legacy.node.ClientActionMessage> {
    const msg: legacy.node.ClientActionMessage = {
      appInstanceId: "",
      action: "" as any,
      data: {},
      multisigAddress: "",
      toAddress: "",
      fromAddress: "",
      seq: 0
    };

    return Promise.resolve(msg);
  }

  receiveMessageFromPeer(incoming: legacy.node.ClientActionMessage) {}
}
