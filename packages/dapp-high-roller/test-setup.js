global.XMLHttpRequest = {
  open: () => {},
  send: () => {},
}
global.cuid = require("../../node_modules/cuid/index");
global.commonTypes = require("../common-types/dist/index-iife");
global.ethers = require("../../node_modules/ethers/dist/ethers");
global.EventEmitter3 = require("../node-provider/node_modules/eventemitter3/umd/eventemitter3");
global.EventEmitter = global.EventEmitter3.EventEmitter;
global.cf = require("../cf.js/dist/index-iife");
global.NodeProvider = require("../node-provider/dist/index-iife").NodeProvider;
