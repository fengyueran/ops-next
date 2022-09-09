import { connect } from 'react-redux';
import { Dispatch } from '@reduxjs/toolkit';
import { RootState } from 'src/store';
import { caseDetail, cases } from 'src/redux';
import { CaseDetailDrawer as S } from './case-detail-drawer';

const mapStateToProps = (state: RootState) => ({
  visible: caseDetail.selectors.loading(state),
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  closeDrawer: () => {
    dispatch(caseDetail.actions.toggleLoading(false));
    dispatch(cases.actions.setOpenCaseID());
  },
});

export const CaseDetailDrawer = connect(mapStateToProps, mapDispatchToProps)(S);
