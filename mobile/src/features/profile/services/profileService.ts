import { User, Student } from '../../../types';
import { getMe, getStudent, updateStudent } from '../../../services/api';

export const fetchCurrentUser = (): Promise<User> => getMe();
export const fetchProfile = (studentId: number): Promise<Student> => getStudent(studentId);
export const updateProfile = (studentId: number, dto: object): Promise<Student> =>
  updateStudent(studentId, dto);