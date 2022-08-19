import { connect } from 'react-redux';
import { Dispatch } from '@reduxjs/toolkit';
import { RootState } from 'src/store';
import { caseDetail } from 'src/redux';
import { CaseDetailDrawer as S } from './case-detail-drawer';

const mapStateToProps = (state: RootState) => ({
  visible: !!caseDetail.selectors.selectedCaseID(state),
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  closeDrawer: () => {
    console.log('999999999999');
    dispatch(caseDetail.actions.setSelectCaseID());
  },
});

export const CaseDetailDrawer = connect(mapStateToProps, mapDispatchToProps)(S);
