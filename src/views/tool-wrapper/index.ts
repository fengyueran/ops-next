import { connect } from 'react-redux';

import { RootState } from 'src/store';
import { selectors } from 'src/redux/other';
import { ToolWrapper as T } from './tool-wrapper';

const mapStateToProps = (state: RootState) => ({
  visible: selectors.microAppVisibleSelector(state),
});

export const ToolWrapper = connect(mapStateToProps)(T);
