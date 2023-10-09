/**
 * @module user
 * Redux slice and related utilities for user data management.
 */

import {
  createAsyncThunk,
  createEntityAdapter,
  createSelector,
  createSlice,
} from '@reduxjs/toolkit';
import { LOADING_STATUS } from '../constants';

/**
 * @typedef {Object} User
 * @property {string} address - User's address.
 * @property {string} strategy - User's strategy.
 */

/**
 * @typedef {Object} UserState
 * @property {string} loadingStatus - Loading status for user data.
 * @property {string | null} error - Error message, if any.
 * @property {User | null} user - User data.
 */

/**
 * Feature key for the user slice.
 * @type {string}
 */
export const USER_FEATURE_KEY = 'user';

/**
 * Entity adapter for user data.
 * @type {import('@reduxjs/toolkit').EntityAdapter<User>}
 */
export const userAdapter = createEntityAdapter();

/**
 * Async thunk to fetch user data.
 * @type {import('@reduxjs/toolkit').AsyncThunk<User[], User>}
 */
export const fetchUser = createAsyncThunk(
  'user/fetchStatus',
  async (input, thunkAPI) => {
    const { address, strategy } = input;
    // Fetch user data here
  }
);

/**
 * Initial state for the user slice.
 * @type {UserState}
 */
export const initialUserState = userAdapter.getInitialState({
  loadingStatus: LOADING_STATUS.NOT_LOADING,
  error: null,
  user: null,
});

/**
 * User slice definition.
 */
export const userSlice = createSlice({
  name: USER_FEATURE_KEY,
  initialState: initialUserState,
  reducers: {
    add: userAdapter.addOne,
    remove: userAdapter.removeOne,
    // ... other reducer actions
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loadingStatus = LOADING_STATUS.LOADING;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.user = action.payload[0];
        state.loadingStatus = LOADING_STATUS.LOADED;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loadingStatus = LOADING_STATUS.ERROR;
        state.error = action.error.message;
      });
  },
});

/**
 * Reducer function for the user slice.
 * @type {import('@reduxjs/toolkit').Reducer<UserState>}
 */
export const userReducer = userSlice.reducer;

/**
 * Action creators for the user slice.
 * @type {Object}
 */
export const userActions = userSlice.actions;

/**
 * Selector for all users.
 */
const { selectAll, selectEntities } = userAdapter.getSelectors();

/**
 * Get the user state from the root state.
 * @param {Object} rootState - The root state.
 * @returns {UserState} The user state.
 */
export const getUserState = (rootState) => rootState[USER_FEATURE_KEY];

/**
 * Select the user data.
 * @type {import('@reduxjs/toolkit').OutputSelector<UserState, User | null, (res: UserState) => User | null>}
 */
export const selectUser = createSelector(getUserState, (state) => state.user);

/**
 * Select the loading status.
 * @type {import('@reduxjs/toolkit').OutputSelector<UserState, string, (res: UserState) => string>}
 */
export const selectLoadingStatus = createSelector(
  getUserState,
  (state) => state.loadingStatus
);

/**
 * Select all users.
 * @type {import('@reduxjs/toolkit').OutputSelector<UserState, User[], (res: UserState) => User[]>}
 */
export const selectAllUsers = createSelector(getUserState, selectAll);

/**
 * Select user entities.
 * @type {import('@reduxjs/toolkit').OutputSelector<UserState, import('reduxjs/toolkit').EntityState<User>, (res: UserState) => import('reduxjs/toolkit').EntityState<User>>}
 */
export const selectUserEntities = createSelector(getUserState, selectEntities);
