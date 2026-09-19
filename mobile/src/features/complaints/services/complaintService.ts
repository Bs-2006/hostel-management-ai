import { Complaint } from '../../../types';
import {
  getComplaints,
  getMyComplaints,
  createComplaint,
  updateComplaintStatus,
} from '../../../services/api';

export const fetchComplaints = (): Promise<Complaint[]> => getComplaints();
export const fetchMyComplaints = (): Promise<Complaint[]> => getMyComplaints();
export const addComplaint = (dto: object): Promise<Complaint> => createComplaint(dto);
export const changeComplaintStatus = (id: number, status: string): Promise<Complaint> =>
  updateComplaintStatus(id, status);