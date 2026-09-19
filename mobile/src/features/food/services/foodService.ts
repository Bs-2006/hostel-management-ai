import { FoodMenu } from '../../../types';
import {
  getFoodMenus,
  createFoodMenu,
  updateFoodMenu,
  deleteFoodMenu,
} from '../../../services/api';

export const fetchFoodMenus = (): Promise<FoodMenu[]> => getFoodMenus();
export const addFoodMenu = (dto: object): Promise<FoodMenu> => createFoodMenu(dto);
export const editFoodMenu = (id: number, dto: object): Promise<FoodMenu> => updateFoodMenu(id, dto);
export const removeFoodMenu = (id: number): Promise<{ message: string }> => deleteFoodMenu(id);