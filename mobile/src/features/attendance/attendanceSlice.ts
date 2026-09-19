import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Attendance } from '../../types';
import { getErrorMessage } from '../../services/api';
import {
  fetchAllAttendance,
  fetchStudentAttendance,
  createAttendanceRecord,
  updateAttendanceRecord,
} from './services/attendanceService';

interface AttendanceState {
  items: Attendance[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: AttendanceState = {
  items: [],
  loading: false,
  saving: false,
  error: null,
};

export const fetchAttendanceList = createAsyncThunk(
  'attendance/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchAllAttendance();
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchMyAttendance = createAsyncThunk(
  'attendance/fetchMine',
  async (studentId: number, { rejectWithValue }) => {
    try {
      return await fetchStudentAttendance(studentId);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const markAttendanceThunk = createAsyncThunk(
  'attendance/mark',
  async (dto: object, { rejectWithValue }) => {
    try {
      return await createAttendanceRecord(dto);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateAttendanceStatus = createAsyncThunk(
  'attendance/update',
  async ({ id, status }: { id: number; status: string }, { rejectWithValue }) => {
    try {
      return await updateAttendanceRecord(id, status);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendanceList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendanceList.fulfilled, (state, action: PayloadAction<Attendance[]>) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchAttendanceList.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Failed to load attendance';
      })
      .addCase(fetchMyAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyAttendance.fulfilled, (state, action: PayloadAction<Attendance[]>) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchMyAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Failed to load attendance';
      })
      .addCase(markAttendanceThunk.fulfilled, (state, action: PayloadAction<Attendance>) => {
        state.saving = false;
        state.items = [action.payload, ...state.items];
      })
      .addCase(markAttendanceThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? 'Failed to mark attendance';
      })
      .addCase(updateAttendanceStatus.fulfilled, (state, action: PayloadAction<Attendance>) => {
        state.items = state.items.map((a) => (a.id === action.payload.id ? action.payload : a));
      })
      .addCase(updateAttendanceStatus.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Failed to update attendance';
      });
  },
});

export default attendanceSlice.reducer;