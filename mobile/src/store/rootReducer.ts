import { combineReducers } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import roomReducer from '../features/rooms/roomSlice';
import studentReducer from '../features/students/studentSlice';
import outingReducer from '../features/outings/outingSlice';
import complaintReducer from '../features/complaints/complaintSlice';
import attendanceReducer from '../features/attendance/attendanceSlice';
import foodReducer from '../features/food/foodSlice';
import profileReducer from '../features/profile/profileSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  rooms: roomReducer,
  students: studentReducer,
  outings: outingReducer,
  complaints: complaintReducer,
  attendance: attendanceReducer,
  food: foodReducer,
  profile: profileReducer,
});

export default rootReducer;