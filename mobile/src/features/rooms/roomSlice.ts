import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Room } from '../../types';
import { getErrorMessage } from '../../services/api';
import {
  fetchRooms as getRooms,
  addRoom as createRoom,
  editRoom as updateRoom,
  removeRoom as deleteRoom,
} from './services/roomService';

interface RoomsState {
  items: Room[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: RoomsState = {
  items: [],
  loading: false,
  saving: false,
  error: null,
};

export const fetchRooms = createAsyncThunk('rooms/fetch', async (_, { rejectWithValue }) => {
  try {
    return await getRooms();
  } catch (err) {
    return rejectWithValue(getErrorMessage(err));
  }
});

export const addRoom = createAsyncThunk('rooms/add', async (dto: object, { rejectWithValue }) => {
  try {
    return await createRoom(dto);
  } catch (err) {
    return rejectWithValue(getErrorMessage(err));
  }
});

export const editRoom = createAsyncThunk(
  'rooms/edit',
  async ({ id, dto }: { id: number; dto: object }, { rejectWithValue }) => {
    try {
      return await updateRoom(id, dto);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const removeRoom = createAsyncThunk('rooms/remove', async (id: number, { rejectWithValue }) => {
  try {
    await deleteRoom(id);
    return id;
  } catch (err) {
    return rejectWithValue(getErrorMessage(err));
  }
});

const roomSlice = createSlice({
  name: 'rooms',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRooms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRooms.fulfilled, (state, action: PayloadAction<Room[]>) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Failed to load rooms';
      })
      .addCase(addRoom.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(addRoom.fulfilled, (state, action: PayloadAction<Room>) => {
        state.saving = false;
        state.items = [action.payload, ...state.items];
      })
      .addCase(addRoom.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? 'Failed to add room';
      })
      .addCase(editRoom.fulfilled, (state, action: PayloadAction<Room>) => {
        state.saving = false;
        state.items = state.items.map((r) => (r.id === action.payload.id ? action.payload : r));
      })
      .addCase(editRoom.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? 'Failed to update room';
      })
      .addCase(removeRoom.fulfilled, (state, action: PayloadAction<number>) => {
        state.items = state.items.filter((r) => r.id !== action.payload);
      })
      .addCase(removeRoom.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Failed to delete room';
      });
  },
});

export default roomSlice.reducer;