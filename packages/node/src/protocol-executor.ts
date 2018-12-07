import { legacy } from "@counterfactual/cf.js";
import {
  InstructionExecutor,
  InstructionExecutorConfig
} from "@counterfactual/machine";

export default class ProtocolExecutor implements legacy.node.ResponseSink {
  private readonly instructionExecutor: InstructionExecutor;

  constructor(networkContext: legacy.network.NetworkContext) {
    this.instructionExecutor = new InstructionExecutor(
      new InstructionExecutorConfig(this, networkContext)
    );
    console.log(this.instructionExecutor);
  }
  sendResponse(response: legacy.node.Response) {}
}
