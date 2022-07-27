import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';

import * as other from 'src/redux/other';
import { microAppMgr, MicroApp } from 'src/utils';
import { getDicom, seriesList, thumbnailList, getAutoQCResultFile } from 'src/mock';

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>): React.FC<Omit<P, 'visible'>> =>
  ({ ...props }) => {
    const microAppVisible = useSelector(other.selectors.microAppVisibleSelector);

    useEffect(() => {
      if (microAppVisible) {
        microAppMgr.loadMicroApp(MicroApp.QC, {
          getDicom,
          seriesList,
          thumbnailList,
          getAutoQCResultFile,
        });
      }
    }, [microAppVisible]);

    return <WrappedComponent {...(props as P)} visible={microAppVisible} />;
  };
