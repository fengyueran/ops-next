import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { completeNode, patchNode } from 'src/api';

export interface State {
  microAppReady: boolean;
  submitPending: boolean;
  microAppVisible: boolean;
  canSubmit: boolean;
  canGotoSeg: boolean;
  gotoSegLoading: boolean;
  canCloseMicroApp: boolean;
  currentOperation?: DetailOperation;
}

const initialState: State = {
  canSubmit: true,
  microAppReady: false,
  submitPending: false,
  microAppVisible: false,
  canGotoSeg: false,
  canCloseMicroApp: false,
  gotoSegLoading: false,
};

interface SubmitData {
  operation: OperationDataAttributes;
  makeSubmitInput: (output: ToolOutput, operation: OperationDataAttributes) => any;
  output: ToolOutput;
}

export const submit = createAsyncThunk<void, SubmitData>('MicroApp/submit', async (data) => {
  const { operation, makeSubmitInput, output } = data;
  const submitInput = await makeSubmitInput(output, operation);
  await completeNode(operation.workflowID, operation.activityID, submitInput);
});

export const patch = createAsyncThunk<void, SubmitData>('MicroApp/patch', async (data) => {
  const { operation, makeSubmitInput, output } = data;
  const submitInput = await makeSubmitInput(output, operation);
  await patchNode(operation.workflowID, operation.step, submitInput);
});

export const slice = createSlice({
  name: 'MicroApp',
  initialState,
  reducers: {
    toggleMicroAppReady(state, action: PayloadAction<boolean>) {
      state.microAppReady = action.payload;
    },
    toggleMicroAppVisible(state, action: PayloadAction<boolean>) {
      state.microAppVisible = action.payload;
      if (state.microAppVisible) {
        state.microAppReady = false;
        state.canCloseMicroApp = false;
      } else {
        state.submitPending = false;
        state.canGotoSeg = false;
        state.gotoSegLoading = false;
      }
    },
    toggleSubmitPending(state, action: PayloadAction<boolean>) {
      state.submitPending = action.payload;
    },
    toggleCanSubmit(state, action: PayloadAction<boolean>) {
      state.canSubmit = action.payload;
    },
    toggleCanGotoSeg(state, action: PayloadAction<boolean>) {
      state.canGotoSeg = action.payload;
    },
    toggleGotoSegLoading(state, action: PayloadAction<boolean>) {
      state.gotoSegLoading = action.payload;
    },
    setCurrentOperation(state, action: PayloadAction<DetailOperation | undefined>) {
      state.currentOperation = action.payload;
    },
    toggleCanCloseMicroApp(state, action: PayloadAction<boolean>) {
      state.canCloseMicroApp = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(submit.fulfilled, (state) => {
      state.submitPending = false;
      state.microAppVisible = false;
    });
    builder.addCase(patch.fulfilled, (state) => {
      state.submitPending = false;
      state.microAppVisible = false;
    });
  },
});

export const actions = { ...slice.actions, submit, patch };

export type SliceType = typeof actions;
