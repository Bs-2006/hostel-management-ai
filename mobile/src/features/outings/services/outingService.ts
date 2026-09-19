import { Outing } from '../../../types';
import {
  getOutings,
  getOuting,
  createOuting,
  approveOuting,
  rejectOuting,
} from '../../../services/api';

export const fetchOutings = (): Promise<Outing[]> => getOutings();
export const fetchOuting = (id: number): Promise<Outing> => getOuting(id);
export const createOutingRequest = (dto: object): Promise<Outing> => createOuting(dto);
export const approve = (id: number): Promise<Outing> => approveOuting(id);
export const reject = (id: number): Promise<Outing> => rejectOuting(id);