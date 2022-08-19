import { configureStore } from '@reduxjs/toolkit';
import { caseFilter, microApp, cases, caseDetail } from 'src/redux';

export const store = configureStore({
  reducer: {
    cases: cases.slice.reducer,
    caseDetail: caseDetail.slice.reducer,
    caseFilter: caseFilter.slice.reducer,
    microApp: microApp.slice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
