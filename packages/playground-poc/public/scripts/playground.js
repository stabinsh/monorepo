'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var nodePoc = require('@counterfactual/node-poc');
var ethers = require('ethers');
var io = _interopDefault(require('socket.io-client'));
var Swal = _interopDefault(require('sweetalert2'));

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

var Dapp = (function () {
    function Dapp(manifest, eventEmitter, userAddress) {
        var _this = this;
        this.manifest = manifest;
        this.eventEmitter = eventEmitter;
        this.ready = false;
        this.userAddress = userAddress;
        this.window = null;
        this.port = null;
        this.messageQueue = [];
        this.eventEmitter.on("message", function (message) {
            if (_this.port) {
                _this.port.postMessage(message);
            }
            else {
                _this.queueMessage(message);
            }
        });
    }
    Dapp.prototype.queueMessage = function (message) {
        this.messageQueue.push(message);
    };
    Dapp.prototype.flushMessageQueue = function () {
        var _this = this;
        this.messageQueue.forEach(function (message) { return _this.port && _this.port.postMessage(message); });
    };
    Dapp.prototype.bindToWindow = function (windowObject) {
        var _this = this;
        this.window = windowObject;
        this.window.addEventListener("message", this.configureMessageChannel.bind(this));
        this.window.addEventListener("load", function () {
            _this.ready = true;
        });
    };
    Dapp.prototype.configureMessageChannel = function (event) {
        if (!this.window) {
            return;
        }
        if (event.data === "cf-node-provider:init") {
            var port2 = this.configureMessagePorts().port2;
            this.window.postMessage("cf-node-provider:port", "*", [port2]);
        }
        if (event.data === "cf-node-provider:ready") {
            this.flushMessageQueue();
        }
    };
    Dapp.prototype.configureMessagePorts = function () {
        var channel = new MessageChannel();
        this.port = channel.port1;
        this.port.addEventListener("message", this.relayMessage.bind(this));
        this.port.start();
        return channel;
    };
    Dapp.prototype.relayMessage = function (event) {
        this.eventEmitter.emit("message", event.data);
    };
    Dapp.prototype.reply = function (originalMessage, data) {
        if (data === void 0) { data = {}; }
        var message = Object.assign({}, originalMessage, data);
        message.peerAddress = originalMessage.fromAddress;
        delete message.fromAddress;
        this.eventEmitter.emit("message", message);
    };
    return Dapp;
}());

var Playground = (function () {
    function Playground(appManifests) {
        this.iframes = {};
        this.user = "";
        this.appManifests = appManifests;
        this.node = null;
    }
    Playground.prototype.showAppList = function () {
        var _this = this;
        Object.keys(this.appManifests).forEach(function (appID) {
            var button = document.createElement("button");
            var manifest = _this.appManifests[appID];
            button.innerText = manifest.name;
            button.addEventListener("click", function () {
                return _this.loadApp(manifest, document.body);
            });
            document.getElementById("dapp-list").appendChild(button);
        });
    };
    Playground.prototype.connectAs = function (address) {
        this.node = new nodePoc.Node(new nodePoc.SocketMessagingService(io, "http://localhost:8080"), address);
        this.user = address;
        document.getElementById("current-user").innerText = address;
        this.bindEvents();
    };
    Playground.prototype.bindEvents = function () {
        var _this = this;
        if (!this.node) {
            return;
        }
        this.node.on("proposeInstall", function (data) {
            Swal({
                title: "Please, confirm",
                text: "Do you want to install " + data.appDefinition.name + "?",
                type: "question",
                showCancelButton: true,
                confirmButtonText: "Yes",
                cancelButtonText: "No"
            }).then(function (result) {
                if (result) {
                    var dapp = _this.loadApp(data.appDefinition, document.body);
                    dapp.reply(data, { type: "install" });
                }
                else {
                    var rejectMessage = __assign({}, data, { peerAddress: data.fromAddress, type: "rejectInstall" });
                    delete rejectMessage.fromAddress;
                    if (_this.node) {
                        _this.node.messagingService.emit("message", rejectMessage);
                    }
                }
            });
        });
        this.node.on("rejectInstall", function (data) {
            Swal("Sorry :(", data.fromAddress + " rejected your install proposal.", "error");
        });
    };
    Playground.prototype.loadApp = function (manifest, parentNode) {
        if (this.iframes[manifest.address]) {
            return this.iframes[manifest.address];
        }
        var iframe = document.createElement("iframe");
        iframe.id = manifest.address;
        iframe.src = manifest.url;
        parentNode.appendChild(iframe);
        var node = this.node;
        var appEventEmitter = node.openApp(manifest.address);
        var dapp = new Dapp(manifest, appEventEmitter, this.user);
        dapp.bindToWindow(iframe.contentWindow);
        this.iframes[iframe.id] = dapp;
        return dapp;
    };
    Playground.prototype.deposit = function () {
        var multisigAddress = new ethers.Wallet("0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d").address;
        var promptedDepositAmount = window.prompt("How much ETH you want to deposit?");
        var depositAmount = ethers.utils.parseEther(promptedDepositAmount);
        var toAddress = "0xa03cE93594B3679652e9f035588077815bFdf6F0";
        var node = this.node;
        node.setupChannel(toAddress, multisigAddress, depositAmount);
    };
    return Playground;
}());

module.exports = Playground;
//# sourceMappingURL=playground.js.map
