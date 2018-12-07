import { Context, types } from "@counterfactual/machine";

import { IStoreService } from "../service-interfaces";

export default class CommitmentStore {
  constructor(private readonly storeService: IStoreService) {
    console.log(this.storeService);
  }

  /**
   * The hook to the machine which will store the commitment produced
   * at the end of a protocol's execution.
   */
  public async setCommitment(
    internalMessage: types.InternalMessage,
    next: Function,
    context: Context
  ) {}
}
