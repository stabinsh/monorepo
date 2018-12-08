import * as waffle from "ethereum-waffle";
import { ethers } from "ethers";

import AppRegistry from "../build/AppRegistry.json";
import LibStaticCall from "../build/LibStaticCall.json";
import Transfer from "../build/Transfer.json";

import {
  AppInstance,
  AppInterface,
  AssetType,
  computeStateHash,
  Terms
} from "../src";

import { ALICE, BOB } from "./constants";
import { expect } from "./utils";

const { hexlify, randomBytes } = ethers.utils;
const { AddressZero, HashZero } = ethers.constants;

// HELPER DATA
const TIMEOUT = 30;

describe("AppRegistry", () => {
  let provider: ethers.providers.Web3Provider;
  let wallet: ethers.Wallet;

  let appRegistry: ethers.Contract;

  let setStateAsOwner: (nonce: number, appState?: string) => Promise<void>;
  let setStateWithSignatures: (
    nonce: number,
    appState?: string
  ) => Promise<void>;
  let cancelChallenge: () => Promise<void>;
  let sendSignedFinalizationToChain: () => Promise<any>;
  let latestState: () => Promise<string>;
  let latestNonce: () => Promise<number>;
  let isStateFinalized: () => Promise<boolean>;

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];

    const libStaticCall = await waffle.deployContract(wallet, LibStaticCall);
    const transfer = await waffle.deployContract(wallet, Transfer);

    waffle.link(AppRegistry, "Transfer", transfer.address);
    waffle.link(AppRegistry, "LibStaticCall", libStaticCall.address);

    appRegistry = await waffle.deployContract(wallet, AppRegistry);
  });

  beforeEach(async () => {
    const appInstance = new AppInstance(
      wallet.address,
      [ALICE.address, BOB.address],
      new AppInterface(
        hexlify(randomBytes(20)),
        hexlify(randomBytes(4)),
        hexlify(randomBytes(4)),
        hexlify(randomBytes(4)),
        hexlify(randomBytes(4))
      ),
      new Terms(AssetType.ETH, 0, AddressZero),
      10
    );

    latestState = async () =>
      (await appRegistry.functions.getAppChallenge(appInstance.id))
        .appStateHash;

    latestNonce = async () =>
      (await appRegistry.functions.getAppChallenge(appInstance.id)).nonce;

    isStateFinalized = async () =>
      await appRegistry.functions.isStateFinalized(appInstance.id);

    setStateAsOwner = (nonce: number, appState?: string) =>
      appRegistry.functions.setState(appInstance.appIdentity, {
        nonce,
        stateHash: appState || HashZero,
        timeout: TIMEOUT,
        signatures: HashZero
      });

    cancelChallenge = () =>
      appRegistry.functions.cancelChallenge(appInstance.appIdentity, HashZero);

    setStateWithSignatures = async (nonce: number, appState?: string) =>
      appRegistry.functions.setState(appInstance.appIdentity, {
        nonce,
        stateHash: appState || HashZero,
        timeout: TIMEOUT,
        signatures: await wallet.signMessage(
          computeStateHash(appInstance.id, appState || HashZero, nonce, TIMEOUT)
        )
      });

    sendSignedFinalizationToChain = async () =>
      appRegistry.functions.setState(appInstance.appIdentity, {
        nonce: (await latestNonce()) + 1,
        stateHash: await latestState(),
        timeout: 0,
        signatures: await wallet.signMessage(
          computeStateHash(
            appInstance.id,
            await latestState(),
            await latestNonce(),
            0
          )
        )
      });
  });

  describe("updating app state", async () => {
    describe("with owner", async () => {
      it("should work with higher nonce", async () => {
        expect(await latestNonce()).to.eq(0);
        await setStateAsOwner(1);
        expect(await latestNonce()).to.eq(1);
      });

      it("should work many times", async () => {
        expect(await latestNonce()).to.eq(0);
        await setStateAsOwner(1);
        expect(await latestNonce()).to.eq(1);
        await cancelChallenge();
        await setStateAsOwner(2);
        expect(await latestNonce()).to.eq(2);
        await cancelChallenge();
        await setStateAsOwner(3);
        expect(await latestNonce()).to.eq(3);
      });

      it("should work with much higher nonce", async () => {
        expect(await latestNonce()).to.eq(0);
        await setStateAsOwner(1000);
        expect(await latestNonce()).to.eq(1000);
      });

      it("shouldn't work with an equal nonce", async () => {
        // @ts-ignore
        await expect(setStateAsOwner(0)).to.be.reverted;
        expect(await latestNonce()).to.eq(0);
      });

      it("shouldn't work with an lower nonce", async () => {
        await setStateAsOwner(1);
        // @ts-ignore
        await expect(setStateAsOwner(0)).to.be.reverted;
        expect(await latestNonce()).to.eq(1);
      });
    });

    describe("with signing keys", async () => {
      it("should work with higher nonce", async () => {
        expect(await latestNonce()).to.eq(0);
        await setStateWithSignatures(1);
        expect(await latestNonce()).to.eq(1);
      });

      it("should work many times", async () => {
        expect(await latestNonce()).to.eq(0);
        await setStateWithSignatures(1);
        expect(await latestNonce()).to.eq(1);
        await cancelChallenge();
        await setStateWithSignatures(2);
        expect(await latestNonce()).to.eq(2);
        await cancelChallenge();
        await setStateWithSignatures(3);
        expect(await latestNonce()).to.eq(3);
      });

      it("should work with much higher nonce", async () => {
        expect(await latestNonce()).to.eq(0);
        await setStateWithSignatures(1000);
        expect(await latestNonce()).to.eq(1000);
      });

      it("shouldn't work with an equal nonce", async () => {
        // @ts-ignore
        await expect(setStateWithSignatures(0)).to.be.reverted;
        expect(await latestNonce()).to.eq(0);
      });

      it("shouldn't work with a lower nonce", async () => {
        await setStateWithSignatures(1);
        // @ts-ignore
        await expect(setStateWithSignatures(0)).to.be.reverted;
        expect(await latestNonce()).to.eq(1);
      });
    });
  });

  describe("finalizing app state", async () => {
    it("should work with keys", async () => {
      expect(await isStateFinalized()).to.be.false;
      await sendSignedFinalizationToChain();
      expect(await isStateFinalized()).to.be.true;
    });
  });

  describe("waiting for timeout", async () => {
    it("should block updates after the timeout", async () => {
      expect(await isStateFinalized()).to.be.false;

      await setStateAsOwner(1);

      for (const _ of Array(TIMEOUT + 1)) {
        await provider.send("evm_mine", []);
      }

      expect(await isStateFinalized()).to.be.true;

      // @ts-ignore
      await expect(setStateAsOwner(2)).to.be.reverted;

      // @ts-ignore
      await expect(setStateWithSignatures(0)).to.be.reverted;
    });
  });

  it("is possible to call setState to put state on-chain", async () => {
    // Test AppInterface
    const appInterface = new AppInterface(
      AddressZero,
      hexlify(randomBytes(4)),
      hexlify(randomBytes(4)),
      hexlify(randomBytes(4)),
      hexlify(randomBytes(4))
    );

    // Test Terms
    const terms = new Terms(AssetType.ETH, 0, AddressZero);

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
      stateHash: hexlify(randomBytes(32)),
      nonce: 1,
      timeout: 10,
      signatures: HashZero
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

    expect(status).to.be.eq(1);
  });
});
