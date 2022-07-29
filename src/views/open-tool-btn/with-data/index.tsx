import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { microAppMgr, MicroApp, MaskEditType } from 'src/utils';
import {
  getDicom,
  getNifti,
  getMask,
  seriesList,
  thumbnailList,
  getAutoQCResultFile,
} from 'src/mock';
import * as other from 'src/redux/other';

interface Props {
  toolName: MicroApp;
}
export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>): React.FC<Props> =>
  ({ ...props }) => {
    const { toolName } = props;
    const dispatch = useDispatch();

    const onClick = useCallback(() => {
      switch (toolName) {
        case MicroApp.QC:
          microAppMgr.loadQCTool({
            getDicom,
            seriesList,
            thumbnailList,
            getAutoQCResultFile,
          });
          dispatch(other.otherActions.toggleMicroAppVisible(true));
          break;
        case MicroApp.MaskEdit:
          microAppMgr.loadMaskEditTool({
            getNifti,
            getMask,
            editType: MaskEditType.Segment,
          });
          dispatch(other.otherActions.toggleMicroAppVisible(true));
          break;
        default:
          break;
      }
    }, [dispatch, toolName]);

    return <WrappedComponent {...(props as P)} toolName={props.toolName} onClick={onClick} />;
  };
