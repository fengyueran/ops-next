import { configureStore } from '@reduxjs/toolkit';
import { caseFilterSlice } from 'src/redux';

export const store = configureStore({
  reducer: {
    caseFilter: caseFilterSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
