import { Student } from '../../../types';
import {
  getStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  assignRoom,
} from '../../../services/api';

export const fetchStudents = (): Promise<Student[]> => getStudents();
export const fetchStudent = (id: number): Promise<Student> => getStudent(id);
export const updateStudentById = (id: number, dto: object): Promise<Student> =>
  updateStudent(id, dto);
export const deleteStudentById = (id: number): Promise<{ message: string }> => deleteStudent(id);
export const assignRoomToStudent = (studentId: number, roomId: number): Promise<Student> =>
  assignRoom(studentId, roomId);