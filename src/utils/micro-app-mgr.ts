import {
  loadMicroApp,
  MicroApp as MicroAppInstance,
  initGlobalState,
  MicroAppStateActions,
  addGlobalUncaughtErrorHandler,
  Entry,
} from 'qiankun';

addGlobalUncaughtErrorHandler((event) => {
  console.error(`Load error: ${(event as any).reason}`);
});

export enum MicroApp {
  QC = 'QC',
  MaskEdit = 'MaskEdit',
  Review = 'FFRValidate',
  Report = 'Report',
}

enum MicroAppEntry {
  QC = 'qc',
  MaskEdit = 'mask-edit',
  Review = 'ffr-validate',
  Report = 'report',
}

const MicroAppDevHostMap = {
  [MicroAppEntry.QC]: 'http://localhost:3001',
  [MicroAppEntry.MaskEdit]: 'http://localhost:3002',
  [MicroAppEntry.Review]: 'http://localhost:3003',
  [MicroAppEntry.Report]: 'http://localhost:3004',
};

export enum MaskEditType {
  Segment = 'Segment',
  Refine = 'Refine',
}

const getMicroAppHost = (name: MicroApp) => {
  const hostMap = {
    [MicroApp.QC]: window.QC_TOOL_HOST || MicroAppEntry.QC,
    [MicroApp.MaskEdit]: window.MaskEdit_TOOL_HOST || MicroAppEntry.MaskEdit,
    [MicroApp.Review]: window.Review_TOOL_HOST || MicroAppEntry.Review,
    [MicroApp.Report]: window.Report_TOOL_HOST || MicroAppEntry.Report,
  };
  return hostMap[name];
};

const MOUNT_NODE = '#tool-mount-node';

export const MessageType = {
  TOOL_READY: 'TOOL_READY',
  SERIES_CHANGE: 'SERIES_CHANGE',
};

class MicroAppMgr {
  private currentTool?: MicroApp;
  private microApp?: MicroAppInstance;

  actions: MicroAppStateActions = initGlobalState({});

  submit = () => {
    this.actions.setGlobalState({ type: 'SUBMIT', data: { tool: this.currentTool } });
  };

  private loadMicroApp = (name: MicroApp, props: any) => {
    this.currentTool = name;
    const options =
      process.env.NODE_ENV === 'development'
        ? {
            // sandbox: {
            //   experimentalStyleIsolation: true,
            // },
            getPublicPath: (entry: Entry) => {
              const key = entry as keyof typeof MicroAppDevHostMap;
              return MicroAppDevHostMap[key];
            },
          }
        : {
            // sandbox: {
            //   experimentalStyleIsolation: true,
            // },
          };

    this.microApp = loadMicroApp(
      {
        name,
        entry: getMicroAppHost(name),
        container: MOUNT_NODE,
        props: {
          ...props,
          setState: this.actions.setGlobalState,
        },
      },
      options,
    );
  };

  loadQCTool = (props: QCToolInput) => {
    this.loadMicroApp(MicroApp.QC, props);
  };

  loadMaskEditTool = (props: MaskEditToolInput) => {
    this.loadMicroApp(MicroApp.MaskEdit, props);
  };

  loadReviewTool = (props: ReviewToolInput) => {
    this.loadMicroApp(MicroApp.Review, props);
  };

  loadReportTool = (props: ReportToolInput) => {
    this.loadMicroApp(MicroApp.Report, props);
  };

  subscribe = (handler: (data: any) => void) => {
    this.actions.onGlobalStateChange((state: Record<string, any>, prev: Record<string, any>) => {
      console.log('Main App onGlobalStateChange', state, prev);
      handler(state);
    });
  };

  unsubscribe = () => {
    this.actions.offGlobalStateChange();
  };

  unmount = () => {
    if (this.microApp?.getStatus() === 'MOUNTED') {
      this.microApp?.unmount();
    }
  };
}

export const microAppMgr = new MicroAppMgr();
