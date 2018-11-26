import { Node, SocketMessagingService } from "@counterfactual/node-poc";
import * as ethers from "ethers";
import io from "socket.io-client";
import Swal from "sweetalert2";

import Dapp from "./dapp";
import { IAppManifests } from "./types";

export default class Playground {
  iframes: { [index: string]: Dapp };
  user: string;
  appManifests: IAppManifests;
  node: Node | null;

  constructor(appManifests) {
    this.iframes = {};
    this.user = "";
    this.appManifests = appManifests;
    this.node = null;
  }

  showAppList() {
    Object.keys(this.appManifests).forEach(appID => {
      const button = document.createElement("button");
      const manifest = this.appManifests[appID];
      button.innerText = manifest.name;
      button.addEventListener("click", () =>
        this.loadApp(manifest, document.body)
      );
      document.getElementById("dapp-list")!.appendChild(button);
    });
  }

  connectAs(address) {
    this.node = new Node(
      new SocketMessagingService(io, "http://localhost:8080"),
      address
    );
    this.user = address;

    document.getElementById("current-user")!.innerText = address;

    this.bindEvents();
  }

  bindEvents() {
    if (!this.node) {
      return;
    }

    this.node.on("proposeInstall", data => {
      Swal({
        title: "Please, confirm",
        text: `Do you want to install ${data.appDefinition.name}?`,
        type: "question",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "No"
      }).then(result => {
        if (result) {
          const dapp = this.loadApp(data.appDefinition, document.body);
          dapp.reply(data, { type: "install" });
        } else {
          const rejectMessage = {
            ...data,
            peerAddress: data.fromAddress,
            type: "rejectInstall"
          };

          delete rejectMessage.fromAddress;
          if (this.node) {
            this.node.messagingService.emit("message", rejectMessage);
          }
        }
      });
    });

    this.node.on("rejectInstall", data => {
      Swal(
        "Sorry :(",
        `${data.fromAddress} rejected your install proposal.`,
        "error"
      );
    });
  }

  /**
   * @param {manifest} Object
   * @param {Element} parentNode
   */
  loadApp(manifest, parentNode) {
    if (this.iframes[manifest.address]) {
      return this.iframes[manifest.address];
    }

    const iframe = document.createElement("iframe");

    iframe.id = manifest.address;
    iframe.src = manifest.url;

    parentNode.appendChild(iframe);

    const node = this.node as Node;
    const appEventEmitter = node.openApp(manifest.address);
    const dapp = new Dapp(manifest, appEventEmitter, this.user);
    dapp.bindToWindow(iframe.contentWindow as Window);

    this.iframes[iframe.id] = dapp;

    return dapp;
  }

  deposit() {
    const multisigAddress = new ethers.Wallet(
      "0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d"
    ).address;
    const promptedDepositAmount = window.prompt(
      "How much ETH you want to deposit?"
    ) as string;
    const depositAmount = ethers.utils.parseEther(promptedDepositAmount);
    const toAddress = "0xa03cE93594B3679652e9f035588077815bFdf6F0";

    const node = this.node as Node;
    node.setupChannel(toAddress, multisigAddress, depositAmount);
  }
}
