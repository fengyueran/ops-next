import { loadMicroApp, MicroApp as MicApp } from 'qiankun';

export enum MicroApp {
  QC = 'qc',
}
const MicroAppHostMap = {
  [MicroApp.QC]: '//localhost:8081',
};

const MOUNT_NODE = '#tool-mount-node';

class MicroAppMgr {
  private microApp?: MicApp;

  loadMicroApp = <P>(name: MicroApp, props: P) => {
    this.microApp = loadMicroApp({
      name,
      entry: MicroAppHostMap[name],
      container: MOUNT_NODE,

      props: {
        ...props,
        log: () => {},
      },
    });
  };

  unmount = () => {
    this.microApp?.unmount();
  };
}

export const microAppMgr = new MicroAppMgr();
