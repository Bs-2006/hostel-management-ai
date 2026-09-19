import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Complaint } from '../../types';
import { getErrorMessage } from '../../services/api';
import {
  fetchComplaints,
  fetchMyComplaints,
  addComplaint,
  changeComplaintStatus,
} from './services/complaintService';

interface ComplaintsState {
  items: Complaint[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: ComplaintsState = {
  items: [],
  loading: false,
  saving: false,
  error: null,
};

export const fetchComplaintsList = createAsyncThunk(
  'complaints/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchComplaints();
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchMyComplaintList = createAsyncThunk(
  'complaints/fetchMine',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchMyComplaints();
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createComplaintThunk = createAsyncThunk(
  'complaints/create',
  async (dto: object, { rejectWithValue }) => {
    try {
      return await addComplaint(dto);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateComplaintStatusThunk = createAsyncThunk(
  'complaints/updateStatus',
  async ({ id, status }: { id: number; status: string }, { rejectWithValue }) => {
    try {
      return await changeComplaintStatus(id, status);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

const complaintSlice = createSlice({
  name: 'complaints',
  initialState,
  reducers: {
    clearComplaints(state) {
      state.items = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchComplaintsList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComplaintsList.fulfilled, (state, action: PayloadAction<Complaint[]>) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchComplaintsList.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Failed to load complaints';
      })
      .addCase(fetchMyComplaintList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyComplaintList.fulfilled, (state, action: PayloadAction<Complaint[]>) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchMyComplaintList.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Failed to load complaints';
      })
      .addCase(createComplaintThunk.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createComplaintThunk.fulfilled, (state, action: PayloadAction<Complaint>) => {
        state.saving = false;
        state.items = [action.payload, ...state.items];
      })
      .addCase(createComplaintThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? 'Failed to create complaint';
      })
      .addCase(updateComplaintStatusThunk.fulfilled, (state, action: PayloadAction<Complaint>) => {
        state.items = state.items.map((c) => (c.id === action.payload.id ? action.payload : c));
      })
      .addCase(updateComplaintStatusThunk.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Failed to update status';
      });
  },
});

export const { clearComplaints } = complaintSlice.actions;
export default complaintSlice.reducer;