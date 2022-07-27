import { configureStore } from '@reduxjs/toolkit';
import { caseFilterSlice, otherSlice } from 'src/redux';

export const store = configureStore({
  reducer: {
    caseFilter: caseFilterSlice.reducer,
    other: otherSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
