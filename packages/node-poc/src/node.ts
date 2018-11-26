import * as cf from "@counterfactual/cf.js";
import * as machine from "@counterfactual/machine";
import * as ethers from "ethers";

import NodeAppEventEmitter from "./node-app-event-emitter";
import { IInputOutput, IMessagingService, IStore } from "./types";

export default class Node {
  messagingService: IMessagingService;
  eventEmitters: { [index: string]: NodeAppEventEmitter[] };
  userAddress: string;
  store: IStore;
  signingKey: ethers.ethers.utils.SigningKey;
  instructionExecutor: machine.instructionExecutor.InstructionExecutor;
  // requests: Map;
  writeAheadLog: machine.writeAheadLog.WriteAheadLog;
  io: IInputOutput;

  sendResponse() {}

  constructor(messagingService, userAddress) {
    this.messagingService = messagingService;
    this.eventEmitters = {};
    this.userAddress = userAddress;

    this.messagingService.emit("identity", { address: userAddress });

    // Machine setup begins here.

    // A mapping of requsts that are coming into the response sink.
    // this.requests = new Map();
    this.store = {
      // new TestCommitmentStore();
      setCommitment() {
        debugger;
      },
      incomingMessage() {
        debugger;
      },
      getTransaction() {
        debugger;
      },
      getAppCount() {
        debugger;
      },
      appExists() {
        debugger;
      },
      appHasCommitments() {
        debugger;
      }
    };

    // tslint:disable-next-line:prefer-const
    let networkContext;
    const privateKey =
      "0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d";

    this.signingKey = new ethers.utils.SigningKey(privateKey);

    if (networkContext === undefined) {
      console.warn(
        `Defaulting network context to ${
          ethers.constants.AddressZero
        } for all contracts.`
      );
    }

    // An instance of a InstructionExecutor that will execute protocols.
    this.instructionExecutor = new machine.instructionExecutor.InstructionExecutor(
      new machine.instructionExecutor.InstructionExecutorConfig(
        this,
        new machine.protocolOperations.EthOpGenerator(),
        networkContext || cf.legacy.network.EMPTY_NETWORK_CONTEXT
      )
    );

    this.writeAheadLog = new machine.writeAheadLog.WriteAheadLog(
      new machine.writeAheadLog.SimpleStringMapSyncDB(),
      this.signingKey.address
    );

    const { Opcode } = machine.instructions;

    // tslint:disable-next-line:no-this-assignment
    const self = this;
    this.io = {
      // new TestIOProvider();
      receiveMessageFromPeer() {
        debugger;
      },
      findMessage() {
        debugger;
      },
      listenOnce() {
        debugger;
      },
      ioSendMessage(internalMessage, next, context) {
        const { value } = context.results.find(
          result => result.opCode === Opcode.IO_PREPARE_SEND
        );
        value.type = "machine:io";
        self.messagingService.emit("message", value);
        debugger;
      },
      waitForIo() {
        debugger;
        return new Promise(resolve => {
          return resolve;
        });
      },
      ackMethod: this.instructionExecutor.receiveClientActionMessageAck.bind(
        this.instructionExecutor
      )
    };

    this.instructionExecutor.register(
      Opcode.ALL,
      async (message, next, context) => {
        this.writeAheadLog.write(message, context);
      }
    );

    this.instructionExecutor.register(
      Opcode.OP_SIGN,
      async (message, next, context) => {
        console.debug("TestResponseSink: Running OP_SIGN middleware.");
        return this.signMyUpdate(message, next, context);
      }
    );

    this.instructionExecutor.register(
      Opcode.OP_SIGN_VALIDATE,
      async (message, next, context) => {
        console.debug("TestResponseSink: Running OP_SIGN_VALIDATE middleware.");
        return this.validateSignatures(message, next, context);
      }
    );

    this.instructionExecutor.register(
      Opcode.IO_SEND,
      this.io.ioSendMessage.bind(this.io)
    );

    this.instructionExecutor.register(
      Opcode.IO_WAIT,
      this.io.waitForIo.bind(this.io)
    );

    this.instructionExecutor.register(
      Opcode.STATE_TRANSITION_COMMIT,
      this.store.setCommitment.bind(this.store)
    );

    // Machine setup ends here.
  }

  signMyUpdate(message, next, context) {
    return Promise.resolve({ r: "123", s: "456", v: 42 });
  }

  validateSignatures(message, next, context) {
    debugger;
  }

  openApp(appID) {
    const eventEmitter = new NodeAppEventEmitter(
      this.messagingService,
      this.userAddress,
      appID
    );

    eventEmitter.on("message", eventData => {
      if (eventData.type === "matchedPlayer") {
        return;
      }

      if (eventData.type === "install") {
      }

      if (eventData.type === "machine:io") {
        delete eventData.type;
        this.instructionExecutor.receiveClientActionMessageAck(eventData);
      }

      // Next phase: This should be the IOProvider of the machine.
      // this.instructionExecutor.receiveClientActionMessage({
      //   data: {},
      //   multisigAddress: '0x0000',
      //   toAddress: eventData.peerAddress,
      //   fromAddress: eventData.fromAddress,
      //   stateChannel: {},
      //   seq: 0,
      //   signature: '',
      // });
    });

    this.eventEmitters[appID] = (this.eventEmitters[appID] || []).concat([
      eventEmitter
    ]);

    return eventEmitter;
  }

  setupChannel(toAddress, multisigAddress, depositAmount) {
    const clientActionMessage = {
      multisigAddress,
      toAddress,
      requestId: "0",
      appId: undefined,
      action: cf.legacy.node.ActionName.SETUP,
      data: {},
      fromAddress: this.userAddress,
      stateChannel: undefined,
      seq: 0
    };

    this.instructionExecutor.receiveClientActionMessage(clientActionMessage);

    // depositamount goes here
  }

  on(event, callback) {
    this.messagingService.on("message", data => {
      if (data.type === event) {
        callback(data);
      }
    });
  }
}
