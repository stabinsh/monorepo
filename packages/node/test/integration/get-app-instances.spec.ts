import {
  AppInstanceInfo,
  Node as NodeTypes
} from "@counterfactual/common-types";
import dotenv from "dotenv";
import { ethers } from "ethers";
import FirebaseServer from "firebase-server";

import { IStoreService, Node, NodeConfig } from "../../src";

import { A_PRIVATE_KEY, B_PRIVATE_KEY } from "../env";
import { MOCK_MESSAGING_SERVICE } from "../mock-services/mock-messaging-service";

import FirebaseServiceFactory from "./services/firebase-service";
import { makeProposalRequest, makeMultisigRequest } from "./utils";

dotenv.config();

describe("Node method follows spec - getAppInstances", () => {
  let firebaseServer: FirebaseServer;
  let storeService: IStoreService;
  let node: Node;
  let nodeConfig: NodeConfig;

  beforeAll(() => {
    const firebaseServiceFactory = new FirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    firebaseServer = firebaseServiceFactory.createServer();
    storeService = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY!
    );
    nodeConfig = {
      MULTISIG_KEY_PREFIX: process.env.FIREBASE_STORE_MULTISIG_PREFIX_KEY!
    };
  });

  beforeEach(() => {
    node = new Node(
      A_PRIVATE_KEY,
      MOCK_MESSAGING_SERVICE,
      storeService,
      nodeConfig
    );
  });

  afterAll(() => {
    firebaseServer.close();
  });

  it("can accept a valid call to get empty list of app instances", async done => {
    const requestId = "1";
    const req: NodeTypes.MethodRequest = {
      requestId,
      type: NodeTypes.MethodName.GET_APP_INSTANCES,
      params: {} as NodeTypes.GetAppInstancesParams
    };

    // Set up listener for the method response
    node.on(req.type, (res: NodeTypes.MethodResponse) => {
      expect(req.type).toEqual(res.type);
      expect(res.requestId).toEqual(requestId);
      expect(res.result).toEqual({
        appInstances: [] as AppInstanceInfo[]
      });
      done();
    });

    // Make the method call
    node.emit(req.type, req);
  });

  it("can accept a valid call to get non-empty list of app instances", async done => {
    // the peer with whom an installation proposal is being made
    const peerAddress = new ethers.Wallet(B_PRIVATE_KEY).address;

    // first, a channel must be opened for it to have an app instance
    const multisigCreationReq = makeMultisigRequest([
      node.address,
      peerAddress
    ]);

    // second, an app instance must be proposed to be installed into that channel
    const appInstanceInstallationProposalRequest = makeProposalRequest(
      peerAddress
    );

    // third, the pending app instance needs to be installed
    // its installation request will be the callback to the proposal response
    const installAppInstanceRequestId = "3";
    let installedAppInstance: AppInstanceInfo;

    // fourth, a call to get app instances can be made
    const getAppInstancesRequestId = "4";
    const getAppInstancesRequest: NodeTypes.MethodRequest = {
      requestId: getAppInstancesRequestId,
      type: NodeTypes.MethodName.GET_APP_INSTANCES,
      params: {} as NodeTypes.GetAppInstancesParams
    };

    // The listeners are setup in reverse order to highlight the callbacks
    // being called in this order as the calls unwind
    // create multisig -> install proposal -> install -> get app instances

    // Set up listener for getting the app that's supposed to be installed
    node.on(getAppInstancesRequest.type, res => {
      expect(getAppInstancesRequest.type).toEqual(res.type);
      expect(res.requestId).toEqual(getAppInstancesRequestId);

      const getAppInstancesResult: NodeTypes.GetAppInstancesResult = res.result;
      expect(getAppInstancesResult.appInstances).toEqual([
        installedAppInstance
      ]);
      done();
    });

    node.on(NodeTypes.MethodName.INSTALL, res => {
      const installResult: NodeTypes.InstallResult = res.result;
      installedAppInstance = installResult.appInstance;
      node.emit(getAppInstancesRequest.type, getAppInstancesRequest);
    });

    node.on(appInstanceInstallationProposalRequest.type, res => {
      const installProposalResult: NodeTypes.ProposeInstallResult = res.result;
      const appInstanceId = installProposalResult.appInstanceId;
      const installAppInstanceRequest: NodeTypes.MethodRequest = {
        requestId: installAppInstanceRequestId,
        type: NodeTypes.MethodName.INSTALL,
        params: {
          appInstanceId
        } as NodeTypes.InstallParams
      };

      node.emit(installAppInstanceRequest.type, installAppInstanceRequest);
    });

    node.on(multisigCreationReq.type, res => {
      const createMultisigResult: NodeTypes.CreateMultisigResult = res.result;
      expect(createMultisigResult.multisigAddress).toBeDefined();

      // Make the call to get all apps
      node.emit(
        appInstanceInstallationProposalRequest.type,
        appInstanceInstallationProposalRequest
      );
    });

    // callback chain trigger
    node.emit(multisigCreationReq.type, multisigCreationReq);
  });
});