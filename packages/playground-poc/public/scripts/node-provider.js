var nodeProvider = (function (exports) {
  'use strict';

  class NodeProvider {
      onMessage(callback) { }
      postMessage(message) { }
  }

  (function (NodeMessageType) {
      NodeMessageType["INSTALL"] = "install";
      NodeMessageType["QUERY"] = "query";
      NodeMessageType["ERROR"] = "error";
  })(exports.NodeMessageType || (exports.NodeMessageType = {}));
  (function (QueryType) {
      QueryType["GET_APP_INSTANCES"] = "getAppInstances";
  })(exports.QueryType || (exports.QueryType = {}));

  exports.NodeProvider = NodeProvider;

  return exports;

}({}));
