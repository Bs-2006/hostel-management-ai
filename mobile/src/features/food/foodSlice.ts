import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FoodMenu } from '../../types';
import { getErrorMessage } from '../../services/api';
import {
  fetchFoodMenus,
  addFoodMenu,
  editFoodMenu,
  removeFoodMenu,
} from './services/foodService';

interface FoodState {
  items: FoodMenu[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: FoodState = {
  items: [],
  loading: false,
  saving: false,
  error: null,
};

export const fetchMenus = createAsyncThunk('food/fetch', async (_, { rejectWithValue }) => {
  try {
    return await fetchFoodMenus();
  } catch (err) {
    return rejectWithValue(getErrorMessage(err));
  }
});

export const addMenu = createAsyncThunk('food/add', async (dto: object, { rejectWithValue }) => {
  try {
    return await addFoodMenu(dto);
  } catch (err) {
    return rejectWithValue(getErrorMessage(err));
  }
});

export const editMenu = createAsyncThunk(
  'food/edit',
  async ({ id, dto }: { id: number; dto: object }, { rejectWithValue }) => {
    try {
      return await editFoodMenu(id, dto);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const removeMenu = createAsyncThunk('food/remove', async (id: number, { rejectWithValue }) => {
  try {
    await removeFoodMenu(id);
    return id;
  } catch (err) {
    return rejectWithValue(getErrorMessage(err));
  }
});

const foodSlice = createSlice({
  name: 'food',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMenus.fulfilled, (state, action: PayloadAction<FoodMenu[]>) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchMenus.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Failed to load menus';
      })
      .addCase(addMenu.fulfilled, (state, action: PayloadAction<FoodMenu>) => {
        state.saving = false;
        state.items = [action.payload, ...state.items];
      })
      .addCase(addMenu.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? 'Failed to add menu';
      })
      .addCase(editMenu.fulfilled, (state, action: PayloadAction<FoodMenu>) => {
        state.saving = false;
        state.items = state.items.map((m) => (m.id === action.payload.id ? action.payload : m));
      })
      .addCase(editMenu.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? 'Failed to update menu';
      })
      .addCase(removeMenu.fulfilled, (state, action: PayloadAction<number>) => {
        state.items = state.items.filter((m) => m.id !== action.payload);
      })
      .addCase(removeMenu.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Failed to delete menu';
      });
  },
});

export default foodSlice.reducer;