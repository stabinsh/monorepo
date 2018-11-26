import { Node, SocketMessagingService } from "@counterfactual/node-poc";
import * as io from "socket.io-client";

const localAddress = "0xa03cE93594B3679652e9f035588077815bFdf6F0";

const node = new Node(
  new SocketMessagingService(io, "http://localhost:8080"),
  localAddress
);

// Is setup akin to ProposeInstall?
node.on("proposeInstall", data => {
  // We're mirroring the counterparty's deposit.
  // This means to automatically approve an installation of the ETHBalanceRefundApp.
  // node.install(/* data.fromAddress, data.multisigAddress, data.depositAmount */);
});
