import jwt from 'jsonwebtoken';
const secret = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const mk = (sub, email, role) => jwt.sign({ sub, email, role }, secret, { expiresIn: '7d' });
const warden = mk(15, 'warden@hostel.com', 'warden');
const student = mk(14, 'student@hostel.com', 'student');
process.stdout.write('WARDEN_TOKEN=' + warden + '\n');
process.stdout.write('STUDENT_TOKEN=' + student + '\n');
