import * as waffle from "ethereum-waffle";
import { ethers } from "ethers";

import ConditionalTransaction from "../build/ConditionalTransaction.json";
import DelegateProxy from "../build/DelegateProxy.json";
import ExampleCondition from "../build/ExampleCondition.json";
import LibStaticCall from "../build/LibStaticCall.json";
import Transfer from "../build/Transfer.json";

import { expect } from "./utils";

describe("ConditionalTransaction", () => {
  let provider: ethers.providers.Web3Provider;
  let wallet: ethers.Wallet;

  let exampleCondition: ethers.Contract;
  let delegateProxy: ethers.Contract;
  let conditionalTransaction: ethers.Contract;

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];

    const transfer = await waffle.deployContract(wallet, Transfer);
    const libStaticCall = await waffle.deployContract(wallet, LibStaticCall);

    waffle.link(ConditionalTransaction, "Transfer", transfer.address);
    waffle.link(ConditionalTransaction, "LibStaticCall", libStaticCall.address);

    conditionalTransaction = await waffle.deployContract(
      wallet,
      ConditionalTransaction
    );
    exampleCondition = await waffle.deployContract(wallet, ExampleCondition);
    delegateProxy = await waffle.deployContract(wallet, DelegateProxy);
  });

  describe("Pre-commit to transfer details", () => {
    const makeCondition = (expectedValue, onlyCheckForSuccess) => ({
      onlyCheckForSuccess,
      expectedValueHash: ethers.utils.solidityKeccak256(
        ["bytes"],
        [expectedValue]
      ),
      parameters: ethers.constants.HashZero,
      selector: exampleCondition.interface.functions.isSatisfiedNoParam.sighash,
      to: exampleCondition.address
    });

    const makeConditionParam = (expectedValue, parameters) => ({
      parameters,
      expectedValueHash: ethers.utils.solidityKeccak256(
        ["bytes"],
        [expectedValue]
      ),
      onlyCheckForSuccess: false,
      selector: exampleCondition.interface.functions.isSatisfiedParam.sighash,
      to: exampleCondition.address
    });

    const trueParam = ethers.utils.defaultAbiCoder.encode(
      ["tuple(bool)"],
      [[true]]
    );

    const falseParam = ethers.utils.defaultAbiCoder.encode(
      ["tuple(bool)"],
      [[false]]
    );

    beforeEach(async () => {
      await wallet.sendTransaction({
        to: delegateProxy.address,
        value: ethers.constants.WeiPerEther
      });
    });

    it("transfers the funds conditionally if true", async () => {
      const randomTarget = ethers.utils.hexlify(ethers.utils.randomBytes(20));
      const tx = conditionalTransaction.interface.functions.executeSimpleConditionalTransaction.encode(
        [
          makeCondition(ethers.constants.HashZero, true),
          {
            value: [ethers.constants.WeiPerEther],
            assetType: 0,
            to: [randomTarget],
            token: ethers.constants.AddressZero,
            data: []
          }
        ]
      );

      await delegateProxy.functions.delegate(
        conditionalTransaction.address,
        tx,
        {
          gasLimit: 600000
        }
      );

      const balTarget = await provider.getBalance(randomTarget);
      expect(balTarget).to.eq(ethers.constants.WeiPerEther);

      const emptyBalance = ethers.constants.Zero;
      const balDelegate = await provider.getBalance(delegateProxy.address);
      expect(balDelegate).to.eq(emptyBalance);
    });

    it("does not transfer the funds conditionally if false", async () => {
      const randomTarget = ethers.utils.hexlify(ethers.utils.randomBytes(20));
      const tx = conditionalTransaction.interface.functions.executeSimpleConditionalTransaction.encode(
        [
          makeConditionParam(trueParam, falseParam),
          {
            value: [ethers.constants.WeiPerEther],
            assetType: 0,
            to: [randomTarget],
            token: ethers.constants.AddressZero,
            data: []
          }
        ]
      );

      await expect(
        delegateProxy.functions.delegate(conditionalTransaction.address, tx, {
          gasLimit: 60000
        })
        // @ts-ignore
      ).to.be.reverted;

      const emptyBalance = ethers.constants.Zero;
      const balTarget = await provider.getBalance(randomTarget);
      expect(balTarget).to.eq(emptyBalance);

      const balDelegate = await provider.getBalance(delegateProxy.address);
      expect(balDelegate).to.eq(ethers.constants.WeiPerEther);
    });
  });
});
