import { loadMicroApp, MicroApp as MicApp } from 'qiankun';

export enum MicroApp {
  QC = 'qc',
  MaskEdit = 'MaskEdit',
}

export enum MaskEditType {
  Segment = 'Segment',
  Refine = 'Refine',
}

const MicroAppHostMap = {
  [MicroApp.QC]: '//localhost:8081',
  [MicroApp.MaskEdit]: '//localhost:8082',
};

const MOUNT_NODE = '#tool-mount-node';

class MicroAppMgr {
  private microApp?: MicApp;

  private loadMicroApp = (name: MicroApp, props: any) => {
    this.microApp = loadMicroApp({
      name,
      entry: MicroAppHostMap[name],
      container: MOUNT_NODE,
      props,
    });
  };

  loadQCTool = (props: QCToolInput) => {
    this.loadMicroApp(MicroApp.QC, props);
  };

  loadMaskEditTool = (props: MaskEditToolInput) => {
    this.loadMicroApp(MicroApp.MaskEdit, props);
  };

  unmount = () => {
    this.microApp?.unmount();
  };
}

export const microAppMgr = new MicroAppMgr();
