import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { API_URL } from '../constants/config';
import { Complaint } from '../types';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@auth_user');
      router.replace('/login');
    }
    return Promise.reject(error);
  },
);

// Extract a human-readable message from any API/network error.
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data!.message.join(', ');
    if (data?.message) return data.message;
    if (status === 400) return 'Invalid input. Please check your details.';
    if (status === 403) return "You don't have permission to do that.";
    if (status === 404) return 'Not found.';
    if (status === 409) return data?.message ?? 'A conflicting record already exists.';
    if (status && status >= 500) return 'Server error. Please try again.';
    if (error.message === 'Network Error') return 'Cannot reach the server. Check your connection.';
    return error.message || 'Something went wrong.';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}

// Auth
export const loginUser = (email: string, password: string) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);

export const registerUser = (dto: object) =>
  api.post('/auth/register', dto).then((r) => r.data);

export const getMe = () => api.get('/users/me').then((r) => r.data);

// Students
export const getStudents = () => api.get('/students').then((r) => r.data);
export const getStudent = (id: number) => api.get(`/students/${id}`).then((r) => r.data);
export const updateStudent = (id: number, dto: object) =>
  api.patch(`/students/${id}`, dto).then((r) => r.data);
export const deleteStudent = (id: number) => api.delete(`/students/${id}`).then((r) => r.data);
export const assignRoom = (studentId: number, roomId: number) =>
  api.patch(`/students/${studentId}/room`, { roomId }).then((r) => r.data);

// Rooms
export const getRooms = () => api.get('/rooms').then((r) => r.data);
export const getRoom = (id: number) => api.get(`/rooms/${id}`).then((r) => r.data);
export const createRoom = (dto: object) => api.post('/rooms', dto).then((r) => r.data);
export const updateRoom = (id: number, dto: object) =>
  api.patch(`/rooms/${id}`, dto).then((r) => r.data);
export const deleteRoom = (id: number) => api.delete(`/rooms/${id}`).then((r) => r.data);

// Outings
export const getOutings = () => api.get('/outings').then((r) => r.data);
export const getOuting = (id: number) => api.get(`/outings/${id}`).then((r) => r.data);
export const createOuting = (dto: object) => api.post('/outings', dto).then((r) => r.data);
export const approveOuting = (id: number) => api.patch(`/outings/${id}/approve`).then((r) => r.data);
export const rejectOuting = (id: number) => api.patch(`/outings/${id}/reject`).then((r) => r.data);

// Complaints
export const getComplaints = () => api.get('/complaints').then((r) => r.data);
export const getMyComplaints = () =>
  api.get<Complaint[]>('/complaints/my').then((r) => r.data);
export const createComplaint = (dto: object) => api.post('/complaints', dto).then((r) => r.data);
export const updateComplaintStatus = (id: number, status: string) =>
  api.patch(`/complaints/${id}`, { status }).then((r) => r.data);

// Attendance
export const getAllAttendance = () => api.get('/attendance').then((r) => r.data);
export const getStudentAttendance = (studentId: number) =>
  api.get(`/attendance/student/${studentId}`).then((r) => r.data);
export const markAttendance = (dto: object) => api.post('/attendance', dto).then((r) => r.data);
export const updateAttendance = (id: number, status: string) =>
  api.patch(`/attendance/${id}`, { status }).then((r) => r.data);

// AI Assistant (Hostel Management Agent)
export const chatWithAI = (message: string, sessionId?: string) =>
  api
    .post<{ reply: string; sessionId?: string }>('/ai/agent/chat', {
      message,
      ...(sessionId ? { sessionId } : {}),
    })
    .then((r) => r.data);

// Food Menu
export const getFoodMenus = () => api.get('/food-menu').then((r) => r.data);
export const createFoodMenu = (dto: object) => api.post('/food-menu', dto).then((r) => r.data);
export const updateFoodMenu = (id: number, dto: object) =>
  api.patch(`/food-menu/${id}`, dto).then((r) => r.data);
export const deleteFoodMenu = (id: number) => api.delete(`/food-menu/${id}`).then((r) => r.data);

export default api;