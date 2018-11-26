export interface IAppManifests {
  [index: string]: IAppManifest;
}

export interface IAppManifest {
  name: string;
  version: string;
  url: string;
  address: string;
}
