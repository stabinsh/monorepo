import { legacy } from "@counterfactual/cf.js";
import {
  InstructionExecutor,
  InstructionExecutorConfig
} from "@counterfactual/machine";

export default class ProtocolExecutor implements legacy.node.ResponseSink {
  private readonly instructionExecutor: InstructionExecutor;

  constructor() {
    this.instructionExecutor = new InstructionExecutor(
      new InstructionExecutorConfig(this, legacy.network.EMPTY_NETWORK_CONTEXT)
    );
    console.log(this.instructionExecutor);
  }
  sendResponse(response: legacy.node.Response) {}
}
