import * as waffle from "ethereum-waffle";
import { ethers } from "ethers";
import * as solc from "solc";

import ContractRegistry from "../build/ContractRegistry.json";
import Proxy from "../build/Proxy.json";

import { expect } from "./utils";

const TEST_CONTRACT_SOLIDITY_CODE = `
  contract Test {
    function sayHello() public pure returns (string) {
      return "hi";
    }
  }`;

describe("ContractRegistry", () => {
  let provider: ethers.providers.Web3Provider;
  let wallet: ethers.Wallet;

  let contractRegistry: ethers.Contract;
  let simpleContract: ethers.Contract;

  function cfaddress(initcode, i) {
    return ethers.utils.solidityKeccak256(
      ["bytes1", "bytes", "uint256"],
      ["0x19", initcode, i]
    );
  }

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];
  });

  beforeEach(async () => {
    contractRegistry = await waffle.deployContract(wallet, ContractRegistry);
  });

  it("computes counterfactual addresses of bytes deployments", async () => {
    expect(cfaddress(ethers.constants.HashZero, 1)).to.eq(
      await contractRegistry.functions.cfaddress(ethers.constants.HashZero, 1)
    );
  });

  it("deploys a contract", done => {
    const output = (solc as any).compile(TEST_CONTRACT_SOLIDITY_CODE, 0);
    const iface = JSON.parse(output.contracts[":Test"].interface);
    const bytecode = `0x${output.contracts[":Test"].bytecode}`;

    const filter = contractRegistry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eq(
        await contractRegistry.resolver(cfaddress(bytecode, 2))
      );
      simpleContract = new ethers.Contract(deployedAddress, iface, wallet);
      expect(await simpleContract.sayHello()).to.eq("hi");
      done();
    };
    const registryContract = contractRegistry.on(filter, callback);
    registryContract.deploy(bytecode, 2);
  });

  it("deploys a contract using msg.sender", done => {
    const output = (solc as any).compile(TEST_CONTRACT_SOLIDITY_CODE, 0);
    const iface = JSON.parse(output.contracts[":Test"].interface);
    const bytecode = `0x${output.contracts[":Test"].bytecode}`;

    const filter = contractRegistry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eq(
        await contractRegistry.resolver(cfaddress(bytecode, 3))
      );

      simpleContract = new ethers.Contract(deployedAddress, iface, wallet);
      expect(await simpleContract.sayHello()).to.eq("hi");
      done();
    };
    const registryContract = contractRegistry.on(filter, callback);
    registryContract.deploy(bytecode, 3);
  });

  it("deploys a Proxy contract contract through as owner", done => {
    const output = (solc as any).compile(TEST_CONTRACT_SOLIDITY_CODE, 0);
    const iface = JSON.parse(output.contracts[":Test"].interface);
    const initcode =
      Proxy.bytecode +
      ethers.utils.defaultAbiCoder
        .encode(["address"], [simpleContract.address])
        .substr(2);

    const filter = contractRegistry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eq(
        await contractRegistry.resolver(cfaddress(initcode, 3))
      );

      const contract = new ethers.Contract(deployedAddress, iface, wallet);
      expect(await contract.sayHello()).to.eq("hi");
      done();
    };

    const registryContract = contractRegistry.on(filter, callback);
    registryContract.deploy(initcode, 3);
  });

  it("deploys a contract and passes arguments", done => {
    const source = `
        contract Test {
            address whatToSay;
            function Test(address _whatToSay) public {
                whatToSay = _whatToSay;
            }
            function sayHello() public view returns (address) {
                return whatToSay;
            }
        }`;
    const output = (solc as any).compile(source, 0);
    const iface = JSON.parse(output.contracts[":Test"].interface);
    const bytecode = `0x${output.contracts[":Test"].bytecode}`;

    const initcode =
      bytecode +
      ethers.utils.defaultAbiCoder
        .encode(["address"], [wallet.address])
        .substr(2);

    const filter = contractRegistry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eq(
        await contractRegistry.resolver(cfaddress(initcode, 4))
      );

      const contract = new ethers.Contract(deployedAddress, iface, wallet);
      expect(await contract.sayHello()).to.eq(wallet.address);
      done();
    };

    const registryContract = contractRegistry.on(filter, callback);
    registryContract.deploy(initcode, 4);
  });
});
