import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import { zip } from 'fflate';

import { other } from 'src/redux';
import { findFileByName, downloadByBuffer } from 'src/utils';
import { NodeOutput, ErrorType } from 'src/type';
import { fetchFileWithCache, fetchCommonFileWithCache } from 'src/api';

import DownloadResultBtn from './download-result-btn';

interface Props {
  patientID: string;
  operation: DetailOperation;
}
const DownloadResultBtnContainer: React.FC<Props> = (props) => {
  const intl = useIntl();
  const { patientID, operation } = props;
  const dispatch = useDispatch();

  const onClick = useCallback(async () => {
    try {
      dispatch(
        other.actions.toggleLoading({
          visible: true,
          tip: intl.formatMessage({ defaultMessage: '下载中...' }),
        }),
      );
      const { input, output } = operation;
      const nifti = findFileByName(NodeOutput.NIFTI, input).value;
      const mask = findFileByName(NodeOutput.EDITED_REFINE_MASK, output!).value;
      const niftiBuffer = await fetchCommonFileWithCache<ArrayBuffer>(nifti, 'arraybuffer');
      const maskBuffer = await fetchFileWithCache<Uint8Array>(mask);
      zip(
        {
          [`${patientID}_iso.nii.gz`]: new Uint8Array(niftiBuffer),
          [`${patientID}_aorta_and_arteries.nii`]: new Uint8Array(maskBuffer),
        },
        (error, data) => {
          if (error) {
            dispatch(
              other.actions.setError({
                type: ErrorType.ZipFileError,
                detail: error.message,
              }),
            );
          } else {
            downloadByBuffer(`${patientID}.zip`, data.buffer);
          }
          dispatch(other.actions.toggleLoading({ visible: false }));
        },
      );
    } catch (error) {
      dispatch(other.actions.toggleLoading({ visible: false }));
      dispatch(
        other.actions.setError({
          type: ErrorType.DownloadResultError,
          detail: (error as Error).message,
        }),
      );
    }
  }, [dispatch, intl, operation, patientID]);

  return <DownloadResultBtn onClick={onClick} />;
};

export default DownloadResultBtnContainer;
