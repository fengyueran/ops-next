import { connect } from 'react-redux';
import { Dispatch } from '@reduxjs/toolkit';
import { RootState } from 'src/store';
import { microApp } from 'src/redux';
import { PatchSegButton as S } from './patch-seg-btn';

import { microAppMgr } from 'src/utils';

const mapStateToProps = (state: RootState) => ({
  disabled: !microApp.selectors.microAppReady(state),
  visible: microApp.selectors.canPatchSeg(state),
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  onClick: () => {
    dispatch(microApp.actions.toggleSubmitPending(true));
    microAppMgr.submit(true);
  },
});

export const PatchSegButton = connect(mapStateToProps, mapDispatchToProps)(S);
