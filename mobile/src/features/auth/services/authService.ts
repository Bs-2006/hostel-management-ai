import { loginUser, registerUser, getMe } from '../../../services/api';
import { User } from '../../../types';

export interface AuthResponse {
  token: string;
  user: User;
}

export const login = (email: string, password: string): Promise<AuthResponse> =>
  loginUser(email, password);

export const register = (dto: object): Promise<AuthResponse> => registerUser(dto);

export const fetchCurrentUser = (): Promise<User> => getMe();