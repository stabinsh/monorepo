export enum NodeEventType {
  INSTALL = "install",
  PROPOSE_INSTALL = "proposeInstall",
  UPDATE_STATE = "updateState",
  UNINSTALL = "uninstall",
  PROPOSE_STATE = "proposeState",
  REJECT_STATE = "rejectState"
}

export interface NodeEvent {
  type: NodeEventType;
}

export interface INodeProvider {
  on(eventType: NodeEventType, callback: (e: NodeEvent) => void);
  once(eventType: NodeEventType, callback: (e: NodeEvent) => void);
  emit(eventType: NodeEventType, event: NodeEvent);

  onMessage(callback: (message: NodeMessage) => void);
  sendMessage(message: NodeMessage);
}

export enum NodeMessageType {
  INSTALL = "install",
  QUERY = "query",
  ERROR = "error"
}

export enum QueryType {
  GET_APP_INSTANCES = "getAppInstances"
}

export interface AppInstanceInfo {
  id: string;
}

export interface NodeQueryData {
  queryType: QueryType;
  appInstances?: AppInstanceInfo[];
}

export interface NodeErrorData {
  message: string;
  extra?: { [key: string]: any };
}

export interface NodeMessage {
  requestId: string;
  messageType: NodeMessageType;
  data: NodeQueryData | NodeErrorData | null;
}
