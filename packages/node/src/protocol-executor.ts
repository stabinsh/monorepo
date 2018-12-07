import { legacy } from "@counterfactual/cf.js";
import {
  InstructionExecutor,
  InstructionExecutorConfig
} from "@counterfactual/machine";

/**
 * The entry point to execute the instructions of the Counterfactual
 * protocols, as described here:
 * https://specs.counterfactual.com
 */
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
