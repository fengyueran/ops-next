import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { completeNode } from 'src/api';

export interface State {
  microAppReady: boolean;
  submitPending: boolean;
  microAppVisible: boolean;
  canSubmit: boolean;
}

const initialState: State = {
  canSubmit: true,
  microAppReady: false,
  submitPending: false,
  microAppVisible: false,
};

export const submit = createAsyncThunk<any, any>('MicroApp/submit', async (data) => {
  const { operation, makeSubmitInput, output } = data;
  const submitInput = await makeSubmitInput(output);
  await completeNode(operation.workflowID, operation.activityID, submitInput);
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
      } else {
        state.submitPending = false;
      }
    },
    toggleSubmitPending(state, action: PayloadAction<boolean>) {
      state.submitPending = action.payload;
    },
    toggleCanSubmit(state, action: PayloadAction<boolean>) {
      state.canSubmit = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(submit.fulfilled, (state) => {
      state.submitPending = false;
      state.microAppVisible = false;
    });
    builder.addCase(submit.rejected, (state, action) => {
      state.submitPending = false;
    });
  },
});

export const actions = { ...slice.actions, submit };

export type SliceType = typeof actions;
