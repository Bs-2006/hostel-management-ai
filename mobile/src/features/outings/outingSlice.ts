import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Outing } from '../../types';
import { getErrorMessage } from '../../services/api';
import {
  fetchOutings,
  createOutingRequest,
  approve,
  reject,
} from './services/outingService';

interface OutingsState {
  items: Outing[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: OutingsState = {
  items: [],
  loading: false,
  saving: false,
  error: null,
};

export const fetchOutingsList = createAsyncThunk(
  'outings/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchOutings();
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createOutingThunk = createAsyncThunk(
  'outings/create',
  async (dto: object, { rejectWithValue }) => {
    try {
      return await createOutingRequest(dto);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const approveOutingThunk = createAsyncThunk(
  'outings/approve',
  async (id: number, { rejectWithValue }) => {
    try {
      return await approve(id);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const rejectOutingThunk = createAsyncThunk(
  'outings/reject',
  async (id: number, { rejectWithValue }) => {
    try {
      return await reject(id);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

const outingSlice = createSlice({
  name: 'outings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOutingsList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOutingsList.fulfilled, (state, action: PayloadAction<Outing[]>) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchOutingsList.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Failed to load outings';
      })
      .addCase(createOutingThunk.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createOutingThunk.fulfilled, (state, action: PayloadAction<Outing>) => {
        state.saving = false;
        state.items = [action.payload, ...state.items];
      })
      .addCase(createOutingThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? 'Failed to create outing';
      })
      .addCase(approveOutingThunk.fulfilled, (state, action: PayloadAction<Outing>) => {
        state.items = state.items.map((o) => (o.id === action.payload.id ? action.payload : o));
      })
      .addCase(approveOutingThunk.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Failed to approve outing';
      })
      .addCase(rejectOutingThunk.fulfilled, (state, action: PayloadAction<Outing>) => {
        state.items = state.items.map((o) => (o.id === action.payload.id ? action.payload : o));
      })
      .addCase(rejectOutingThunk.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Failed to reject outing';
      });
  },
});

export default outingSlice.reducer;