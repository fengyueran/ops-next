import { loadMicroApp, MicroApp as MicApp, initGlobalState, MicroAppStateActions } from 'qiankun';

export enum MicroApp {
  QC = 'QC',
  MaskEdit = 'MaskEdit',
  Review = 'Review',
  Report = 'Report',
}

export enum MaskEditType {
  Segment = 'Segment',
  Refine = 'Refine',
}

const MicroAppHostMap = {
  [MicroApp.QC]: '//localhost:3001',
  [MicroApp.MaskEdit]: '//localhost:3002',
  [MicroApp.Review]: '//localhost:3003',
  [MicroApp.Report]: '//localhost:3004',
};

const MOUNT_NODE = '#tool-mount-node';

export const MessageType = {
  TOOL_READY: 'TOOL_READY',
};

class MicroAppMgr {
  private currentTool?: string;
  private microApp?: MicApp;

  actions: MicroAppStateActions = initGlobalState({});

  submit = () => {
    this.actions.setGlobalState({ type: 'SUBMIT', data: { tool: this.currentTool } });
  };

  private loadMicroApp = (name: MicroApp, props: any) => {
    this.currentTool = name;
    this.microApp = loadMicroApp(
      {
        name,
        entry: MicroAppHostMap[name],
        container: MOUNT_NODE,
        props: {
          ...props,
          setState: this.actions.setGlobalState,
        },
      },
      {
        sandbox: {
          experimentalStyleIsolation: true,
        },
      },
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
    this.microApp?.unmount();
  };
}

export const microAppMgr = new MicroAppMgr();
