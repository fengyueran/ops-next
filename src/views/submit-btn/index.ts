import { connect } from 'react-redux';
import { Dispatch } from '@reduxjs/toolkit';
import { RootState } from 'src/store';
import { microApp } from 'src/redux';
import { SubmitButton as S } from './submit-btn';

import { microAppMgr } from 'src/utils';

const mapStateToProps = (state: RootState) => ({
  disabled: !microApp.selectors.microAppReady(state),
  visible: microApp.selectors.canSubmit(state),
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  onClick: () => {
    dispatch(microApp.actions.toggleSubmitPending(true));
    microAppMgr.submit();
  },
});

export const SubmitButton = connect(mapStateToProps, mapDispatchToProps)(S);
