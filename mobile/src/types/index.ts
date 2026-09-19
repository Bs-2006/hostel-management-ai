export type Role = 'student' | 'warden';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
  updatedAt?: string;
  student?: Student | null;
}

export interface Student {
  id: number;
  rollNumber: string;
  branch: string;
  year: number;
  userId: number;
  roomId: number | null;
  user?: User | null;
  room?: Room | null;
}

export interface Room {
  id: number;
  roomNumber: string;
  block: string;
  floor: number;
  capacity: number;
  occupied: number;
  occupants?: Array<{ name: string; userId: number; rollNumber: string; branch: string; year: number }>;
}

export type OutingStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Outing {
  id: number;
  destination: string;
  reason: string;
  outingDate: string;
  outTime: string;
  inTime: string;
  status: OutingStatus;
  studentId: number;
}

export type ComplaintStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

export interface Complaint {
  id: number;
  title: string;
  description: string;
  status: ComplaintStatus;
  studentId: number;
  student?: Student | null;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT';

export interface Attendance {
  id: number;
  date: string;
  status: AttendanceStatus;
  studentId: number;
  student?: Student | null;
}

export type FoodDay =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface FoodMenu {
  id: number;
  day: FoodDay;
  breakfast: string;
  lunch: string;
  snacks: string;
  dinner: string;
}