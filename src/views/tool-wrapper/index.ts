import { connect } from 'react-redux';

import { RootState } from 'src/store';
import { microApp } from 'src/redux';
import { ToolWrapper as T } from './tool-wrapper';

const mapStateToProps = (state: RootState) => ({
  visible: microApp.selectors.microAppVisible(state),
});

export const ToolWrapper = connect(mapStateToProps)(T);
