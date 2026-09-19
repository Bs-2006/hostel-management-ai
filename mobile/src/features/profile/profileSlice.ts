import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Student } from '../../types';
import { getErrorMessage } from '../../services/api';
import { fetchProfile, updateProfile } from './services/profileService';

interface ProfileState {
  student: Student | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  student: null,
  loading: false,
  saving: false,
  error: null,
};

export const loadProfile = createAsyncThunk(
  'profile/fetch',
  async (studentId: number, { rejectWithValue }) => {
    try {
      return await fetchProfile(studentId);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const saveProfile = createAsyncThunk(
  'profile/save',
  async ({ studentId, dto }: { studentId: number; dto: object }, { rejectWithValue }) => {
    try {
      return await updateProfile(studentId, dto);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadProfile.fulfilled, (state, action: PayloadAction<Student>) => {
        state.loading = false;
        state.student = action.payload;
      })
      .addCase(loadProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Failed to load profile';
      })
      .addCase(saveProfile.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveProfile.fulfilled, (state, action: PayloadAction<Student>) => {
        state.saving = false;
        state.student = action.payload;
      })
      .addCase(saveProfile.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? 'Failed to update profile';
      });
  },
});

export default profileSlice.reducer;