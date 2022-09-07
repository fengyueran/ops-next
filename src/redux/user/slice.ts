import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface State {
  user?: object;
  token?: string;
}

const initialState: State = {};

export const slice = createSlice({
  name: 'User',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<LoginResponse | undefined>) {
      if (action.payload) {
        const { jwt, user } = action.payload;
        state.token = jwt;
        state.user = user;
      } else {
        state.token = undefined;
        state.user = undefined;
      }
    },
  },
});

export const actions = slice.actions;

export type SliceType = typeof actions;
