export class LoginDto {
  email: string;
  password: string;
}

export class RegisterDto {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'warden';
  // student-specific fields (required when role === 'student')
  rollNumber?: string;
  branch?: string;
  year?: number;
}
