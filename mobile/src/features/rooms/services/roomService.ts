import { Room } from '../../../types';
import {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
} from '../../../services/api';

export const fetchRooms = (): Promise<Room[]> => getRooms();
export const fetchRoom = (id: number): Promise<Room> => getRoom(id);
export const addRoom = (dto: object): Promise<Room> => createRoom(dto);
export const editRoom = (id: number, dto: object): Promise<Room> => updateRoom(id, dto);
export const removeRoom = (id: number): Promise<{ message: string }> => deleteRoom(id);