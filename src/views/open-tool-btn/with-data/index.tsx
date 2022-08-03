import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { microAppMgr, MicroApp, MaskEditType } from 'src/utils';
import {
  getDicom,
  getNifti,
  getMask,
  seriesList,
  thumbnailList,
  getPly,
  getCenterlines,
  getAutoQCResultFile,
} from 'src/mock';
import * as other from 'src/redux/other';

interface Props {
  caseInfo: CaseInfo;
}

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>): React.FC<Props> =>
  ({ ...props }) => {
    const { caseInfo } = props;

    const dispatch = useDispatch();

    const onClick = useCallback(() => {
      const step = caseInfo.step as MicroApp;
      switch (step) {
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
        case MicroApp.Review:
          microAppMgr.loadReviewTool({
            caseInfo: {
              PatientName: caseInfo.PatientName!,
              PatientSex: caseInfo.PatientSex!,
              PatientAge: caseInfo.PatientAge!,
              PatientID: caseInfo.PatientID!,
              StudyDate: caseInfo.StudyDate!,
              AccessionNumber: caseInfo.AccessionNumber,
            },
            getNifti,
            getMask,
            getPly,
            getCenterlines,
          });
          dispatch(other.otherActions.toggleMicroAppVisible(true));
          break;
        default:
          throw new Error('There is no corresponding tool!');
      }
    }, [dispatch, caseInfo]);

    return <WrappedComponent {...(props as P)} toolName={caseInfo.step} onClick={onClick} />;
  };
