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

export enum LoadStatus {
  NOT_MOUNTED,
  MOUNTED,
}

const getMicroAppHost = (name: MicroApp) => {
  const hostMap = {
    [MicroApp.QC]: window.QC_TOOL_HOST || MicroAppEntry.QC,
    [MicroApp.MaskEdit]: window.MaskEdit_TOOL_HOST || MicroAppEntry.MaskEdit,
    [MicroApp.Review]: window.Review_TOOL_HOST || MicroAppEntry.Review,
    [MicroApp.Report]: window.Report_TOOL_HOST || MicroAppEntry.Report,
  };
  return `${hostMap[name]}?now=${Date.now()}`;
};

const MOUNT_NODE = '#tool-mount-node';

export const MessageType = {
  TOOL_READY: 'TOOL_READY',
  SERIES_CHANGE: 'SERIES_CHANGE',
};

class MicroAppMgr {
  private currentTool?: MicroApp;
  private microApp?: MicroAppInstance;
  private onStatusChange?: (status: LoadStatus) => void;

  private _status = LoadStatus.NOT_MOUNTED;

  actions: MicroAppStateActions = initGlobalState({});

  submit = () => {
    this.actions.setGlobalState({ type: 'SUBMIT', data: { tool: this.currentTool } });
  };

  private loadMicroApp = (name: MicroApp, props: any) => {
    this.currentTool = name;
    this.status = LoadStatus.NOT_MOUNTED;
    const options =
      process.env.NODE_ENV === 'development'
        ? {
            // sandbox: {
            //   experimentalStyleIsolation: true,
            // },
            getPublicPath: (entry: Entry) => {
              const entryWithTime = entry as string;
              const key = entryWithTime.split('?now=')[0] as keyof typeof MicroAppDevHostMap;

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

    this.microApp.mountPromise.then((data) => {
      this.status = LoadStatus.MOUNTED;
    });
  };

  set status(status: LoadStatus) {
    this._status = status;
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }

  loadQCTool = (props: QCToolInput) => {
    this.loadMicroApp(MicroApp.QC, props);
  };

  loadMaskEditTool = (props: MaskEditToolInput) => {
    this.loadMicroApp(MicroApp.MaskEdit, props);
  };

  loadReviewTool = (props: ReviewToolInput) => {
    // this.loadMicroApp(MicroApp.Review, props);
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

  unmount = async () => {
    if (this.microApp?.getStatus() === 'MOUNTED') {
      console.log('start');
      await this.microApp?.unmount();
      console.log('end');
    }
  };

  subscribeStatusChange = (onStatusChange: (status: LoadStatus) => void) => {
    this.onStatusChange = onStatusChange;
  };
}

export const microAppMgr = new MicroAppMgr();
