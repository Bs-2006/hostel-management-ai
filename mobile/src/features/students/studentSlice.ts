import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Student } from '../../types';
import { getErrorMessage } from '../../services/api';
import {
  fetchStudents,
  updateStudentById,
  deleteStudentById,
  assignRoomToStudent,
} from './services/studentService';

interface StudentsState {
  items: Student[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: StudentsState = {
  items: [],
  loading: false,
  saving: false,
  error: null,
};

export const fetchStudentsList = createAsyncThunk(
  'students/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchStudents();
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateStudentRecord = createAsyncThunk(
  'students/update',
  async ({ id, dto }: { id: number; dto: object }, { rejectWithValue }) => {
    try {
      return await updateStudentById(id, dto);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const deleteStudentRecord = createAsyncThunk(
  'students/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await deleteStudentById(id);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const assignRoomThunk = createAsyncThunk(
  'students/assignRoom',
  async ({ studentId, roomId }: { studentId: number; roomId: number }, { rejectWithValue }) => {
    try {
      return await assignRoomToStudent(studentId, roomId);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

const studentSlice = createSlice({
  name: 'students',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudentsList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudentsList.fulfilled, (state, action: PayloadAction<Student[]>) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchStudentsList.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Failed to load students';
      })
      .addCase(updateStudentRecord.fulfilled, (state, action: PayloadAction<Student>) => {
        state.saving = false;
        state.items = state.items.map((s) => (s.id === action.payload.id ? action.payload : s));
      })
      .addCase(updateStudentRecord.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? 'Failed to update student';
      })
      .addCase(deleteStudentRecord.fulfilled, (state, action: PayloadAction<number>) => {
        state.items = state.items.filter((s) => s.id !== action.payload);
      })
      .addCase(deleteStudentRecord.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Failed to delete student';
      })
      .addCase(assignRoomThunk.fulfilled, (state, action: PayloadAction<Student>) => {
        state.saving = false;
        state.items = state.items.map((s) => (s.id === action.payload.id ? action.payload : s));
      })
      .addCase(assignRoomThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? 'Failed to assign room';
      });
  },
});

export default studentSlice.reducer;