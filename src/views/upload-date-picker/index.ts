import { connect } from 'react-redux';
import { Dispatch } from '@reduxjs/toolkit';

import { caseFilter } from 'src/redux';
import { UploadDatePicker as C } from './upload-date-picker';

const mapDispatchToProps = (dispatch: Dispatch) => ({
  onDateRange: (dateRange: [string, string]) => {
    dispatch(caseFilter.actions.updateFilter({ dateRange }));
  },
});

export const UploadDatePicker = connect(null, mapDispatchToProps)(C);
