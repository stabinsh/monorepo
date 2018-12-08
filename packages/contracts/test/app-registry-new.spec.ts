import * as waffle from "ethereum-waffle";
import { ethers } from "ethers";

import AppRegistry from "../build/AppRegistry.json";
import LibStaticCall from "../build/LibStaticCall.json";
import Transfer from "../build/Transfer.json";

import { AppInstance, AppInterface, AssetType, Terms } from "../src/index";

import { ALICE, BOB } from "./constants";
import { expect } from "./utils";

describe("AppRegistry - Counterparty is Unresponsive", () => {
  let provider: ethers.providers.Web3Provider;
  let wallet: ethers.Wallet;

  let appRegistry: ethers.Contract;

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];

    const libStaticCall = await waffle.deployContract(wallet, LibStaticCall);

    waffle.link(AppRegistry, "LibStaticCall", libStaticCall.address);

    appRegistry = await waffle.deployContract(wallet, AppRegistry);
  });

  it("is possible to call setState to put state on-chain", async () => {
    // Test AppInterface
    const appInterface = new AppInterface(
      ethers.constants.AddressZero,
      ethers.utils.hexlify(ethers.utils.randomBytes(4)),
      ethers.utils.hexlify(ethers.utils.randomBytes(4)),
      ethers.utils.hexlify(ethers.utils.randomBytes(4)),
      ethers.utils.hexlify(ethers.utils.randomBytes(4))
    );

    // Test Terms
    const terms = new Terms(AssetType.ETH, 0, ethers.constants.AddressZero);

    // Setup AppInstance
    const appInstance = new AppInstance(
      wallet.address,
      [ALICE.address, BOB.address],
      appInterface,
      terms,
      10
    );

    // Tell the AppRegistry to start timer
    await appRegistry.functions.setState(appInstance.appIdentity, {
      stateHash: ethers.utils.hexlify(ethers.utils.randomBytes(32)),
      nonce: 1,
      timeout: 10,
      signatures: ethers.constants.HashZero
    });

    // Verify the correct data was put on-chain
    const {
      status,
      latestSubmitter,
      appStateHash,
      disputeCounter,
      disputeNonce,
      finalizesAt,
      nonce
    } = await appRegistry.functions.appStates(appInstance.id);

    console.log({
      status,
      latestSubmitter,
      appStateHash,
      disputeCounter,
      disputeNonce,
      finalizesAt,
      nonce
    });

    expect(status).to.be.eq(1);
  });
});
