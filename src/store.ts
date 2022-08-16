import { configureStore } from '@reduxjs/toolkit';
import { caseFilter, microApp, cases } from 'src/redux';

export const store = configureStore({
  reducer: {
    cases: cases.slice.reducer,
    caseFilter: caseFilter.slice.reducer,
    microApp: microApp.slice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
