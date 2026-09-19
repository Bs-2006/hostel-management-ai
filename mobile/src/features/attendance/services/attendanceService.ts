import { Attendance } from '../../../types';
import {
  getAllAttendance,
  getStudentAttendance,
  markAttendance,
  updateAttendance,
} from '../../../services/api';

export const fetchAllAttendance = (): Promise<Attendance[]> => getAllAttendance();
export const fetchStudentAttendance = (studentId: number): Promise<Attendance[]> =>
  getStudentAttendance(studentId);
export const createAttendanceRecord = (dto: object): Promise<Attendance> => markAttendance(dto);
export const updateAttendanceRecord = (id: number, status: string): Promise<Attendance> =>
  updateAttendance(id, status);