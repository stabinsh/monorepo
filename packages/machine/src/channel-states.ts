import * as cf from "@counterfactual/cf.js";

/**
 * This encapsulates the state of all the channels.
 * // TODO: This machine will be refactored to be more stateless once
 * https://github.com/counterfactual/monorepo/pull/163 is merged.
 */
export class ChannelStates {
  public channels: cf.legacy.channel.StateChannelInfos;
  public networkContext: cf.legacy.network.NetworkContext;

  constructor(
    channelStates: cf.legacy.channel.StateChannelInfos,
    network: cf.legacy.network.NetworkContext
  ) {
    this.channels = channelStates;
    this.networkContext = network;
  }

  public stateChannel(
    multisig: cf.legacy.utils.Address
  ): cf.legacy.channel.StateChannelInfo {
    return this.channels[multisig];
  }

  public stateChannelFromMultisigAddress(
    multisigAddress: cf.legacy.utils.Address
  ): cf.legacy.channel.StateChannelInfo {
    const multisig = this.channels[multisigAddress];
    if (multisig) {
      return this.channels[multisigAddress];
    }
    throw Error(`Could not find multisig of address ${multisigAddress}`);
  }

  public app(
    multisig: cf.legacy.utils.Address,
    cfAddr: cf.legacy.utils.H256
  ): cf.legacy.app.AppInstanceInfo {
    return this.channels[multisig].appInstances[cfAddr];
  }

  public freeBalanceFromMultisigAddress(
    multisigAddress: cf.legacy.utils.Address
  ): cf.legacy.utils.FreeBalance {
    const multisig = this.channels[multisigAddress];
    if (multisig) {
      return this.channels[multisigAddress].freeBalance;
    }
    throw Error(`Could not find multisig of address ${multisigAddress}`);
  }

  /**
   * @returns a deep copy of the StateChannelInfos.
   */
  public stateChannelInfosCopy(): cf.legacy.channel.StateChannelInfos {
    return cf.legacy.utils.serializer.deserialize(
      JSON.parse(JSON.stringify(this.channels))
    );
  }

  public appChannelInfos(): cf.legacy.app.AppInstanceInfos {
    const infos = {};
    for (const channel of Object.keys(this.channels)) {
      for (const appChannel of Object.keys(
        this.channels[channel].appInstances
      )) {
        infos[appChannel] = this.channels[channel].appInstances[appChannel];
      }
    }
    return infos;
  }
}

export class StateChannelInfoImpl
  implements cf.legacy.channel.StateChannelInfo {
  constructor(
    readonly counterParty: cf.legacy.utils.Address,
    readonly me: cf.legacy.utils.Address,
    readonly multisigAddress: cf.legacy.utils.Address,
    readonly appInstances: cf.legacy.app.AppInstanceInfos = {},
    readonly freeBalance: cf.legacy.utils.FreeBalance
  ) {}

  /**
   * @returns the toAddress, fromAddress in alphabetical order.
   */
  public owners(): string[] {
    return [this.counterParty, this.me].sort((a, b) => (a < b ? -1 : 1));
  }
}
