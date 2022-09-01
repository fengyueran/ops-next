import { configureStore } from '@reduxjs/toolkit';
import { caseFilter, microApp, cases, caseDetail, other } from 'src/redux';

export const store = configureStore({
  reducer: {
    cases: cases.slice.reducer,
    other: other.slice.reducer,
    caseDetail: caseDetail.slice.reducer,
    caseFilter: caseFilter.slice.reducer,
    microApp: microApp.slice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
