# Mobile App Requirements — Hostel Management AI

## Tech Stack
- Expo (SDK 54) + React Native 0.81
- TypeScript
- Expo Router (file-based routing via `app/` directory)
- AsyncStorage — token and user persistence
- Fetch API or Axios — API calls
- Redux Toolkit or Zustand — global state (auth + data)

Base API URL: `http://<YOUR_LOCAL_IP>:3000`
(Use your machine's LAN IP, not localhost, when testing on a physical device)

---

## Project Structure (extend existing scaffold)

```
app/
├── _layout.tsx              # Root layout — wraps with auth provider
├── index.tsx                # Entry — redirects to login or dashboard
├── (auth)/
│   ├── login.tsx
│   └── register.tsx
├── (app)/
│   ├── _layout.tsx          # Tab/drawer layout (role-aware)
│   ├── dashboard.tsx
│   ├── rooms/
│   │   ├── index.tsx        # List
│   │   └── [id].tsx         # Detail
│   ├── students/
│   │   ├── index.tsx        # Warden: all students
│   │   └── [id].tsx         # Detail + assign room
│   ├── profile.tsx          # Student self-view
│   ├── outings/
│   │   ├── index.tsx
│   │   └── create.tsx
│   ├── complaints/
│   │   ├── index.tsx
│   │   └── create.tsx
│   ├── attendance/
│   │   └── index.tsx
│   └── food-menu/
│       └── index.tsx

src/
├── services/
│   └── api.ts               # Fetch/Axios instance + all API functions
├── store/
│   ├── store.ts             # Redux/Zustand setup
│   └── rootReducer.ts       # Auth slice + feature slices
├── features/
│   ├── auth/                # Login, register, getMe logic
│   ├── rooms/               # Room CRUD logic
│   ├── students/            # Student CRUD + assign room
│   ├── outings/             # Outing create + approve/reject
│   ├── complaints/          # Complaint create + update status
│   ├── attendance/          # Mark + view attendance
│   ├── food/                # Food menu CRUD
│   └── profile/             # Student profile view/edit
├── components/
│   ├── Button.tsx           # Already scaffolded
│   ├── Card.tsx             # Already scaffolded
│   ├── Input.tsx            # Already scaffolded
│   ├── Loading.tsx          # Already scaffolded
│   ├── StatusBadge.tsx      # NEW — colored badge for statuses
│   └── RoleGuard.tsx        # NEW — hide content based on role
├── constants/
│   ├── colors.ts            # Already scaffolded — fill with palette
│   └── config.ts            # Already scaffolded — fill with API_URL
└── utils/
    ├── formatDate.ts        # Already scaffolded
    └── validation.ts        # Already scaffolded
```

---

## Auth & Token Management

- After login/register, store the JWT token and user object using **AsyncStorage**.
- Keys: `@auth_token`, `@auth_user`
- Attach token on every API request: `Authorization: Bearer <token>`
- User object shape: `{ id, name, email, role }` where role is `"student"` or `"warden"`
- On app launch, read token + user from AsyncStorage to restore session.
- If no token, redirect to `/(auth)/login`.
- If API returns 401, clear AsyncStorage and redirect to login.
- On logout, clear AsyncStorage and navigate to login.

---

## API Service (`src/services/api.ts`)

Create one configured instance (Axios or fetch wrapper) with:
- `baseURL` from `src/constants/config.ts`
- Request interceptor that reads token from AsyncStorage and attaches it
- Response interceptor that catches 401 and triggers logout

Export one typed function per API operation:

### Auth
| Function | Method | Endpoint |
|---|---|---|
| `loginUser(email, password)` | POST | `/auth/login` |
| `registerUser(dto)` | POST | `/auth/register` |
| `getMe()` | GET | `/users/me` |

### Students
| Function | Method | Endpoint |
|---|---|---|
| `getStudents()` | GET | `/students` |
| `getStudent(id)` | GET | `/students/:id` |
| `updateStudent(id, dto)` | PATCH | `/students/:id` |
| `deleteStudent(id)` | DELETE | `/students/:id` |
| `assignRoom(studentId, roomId)` | PATCH | `/students/:id/room` |

### Rooms
| Function | Method | Endpoint |
|---|---|---|
| `getRooms()` | GET | `/rooms` |
| `getRoom(id)` | GET | `/rooms/:id` |
| `createRoom(dto)` | POST | `/rooms` |
| `updateRoom(id, dto)` | PATCH | `/rooms/:id` |
| `deleteRoom(id)` | DELETE | `/rooms/:id` |

### Outings
| Function | Method | Endpoint |
|---|---|---|
| `getOutings()` | GET | `/outings` |
| `getOuting(id)` | GET | `/outings/:id` |
| `createOuting(dto)` | POST | `/outings` |
| `approveOuting(id)` | PATCH | `/outings/:id/approve` |
| `rejectOuting(id)` | PATCH | `/outings/:id/reject` |

### Complaints
| Function | Method | Endpoint |
|---|---|---|
| `getComplaints()` | GET | `/complaints` |
| `getComplaint(id)` | GET | `/complaints/:id` |
| `createComplaint(dto)` | POST | `/complaints` |
| `updateComplaintStatus(id, status)` | PATCH | `/complaints/:id` |

### Attendance
| Function | Method | Endpoint |
|---|---|---|
| `getAllAttendance()` | GET | `/attendance` |
| `getStudentAttendance(studentId)` | GET | `/attendance/student/:studentId` |
| `markAttendance(dto)` | POST | `/attendance` |
| `updateAttendance(id, status)` | PATCH | `/attendance/:id` |

### Food Menu
| Function | Method | Endpoint |
|---|---|---|
| `getFoodMenus()` | GET | `/food-menu` |
| `getFoodMenu(id)` | GET | `/food-menu/:id` |
| `createFoodMenu(dto)` | POST | `/food-menu` |
| `updateFoodMenu(id, dto)` | PATCH | `/food-menu/:id` |
| `deleteFoodMenu(id)` | DELETE | `/food-menu/:id` |

---

## Navigation Structure

Use **Expo Router** with two route groups:

- `/(auth)` — public, no token needed
- `/(app)` — protected, requires token

Root `_layout.tsx` checks AsyncStorage on mount. If no token → redirect to `/(auth)/login`. If token exists → redirect to `/(app)/dashboard`.

`/(app)/_layout.tsx` uses a **bottom tab navigator** or **drawer** with role-based tabs:

Warden tabs: Dashboard, Students, Rooms, Outings, Complaints, Attendance, Food Menu

Student tabs: Dashboard, My Profile, Rooms, Outings, Complaints, Attendance, Food Menu

---

## Screen-by-Screen Requirements

---

### Login (`/(auth)/login`)
- `TextInput` for email and password (secureTextEntry for password)
- Login button → calls `loginUser()`
- On success: save token + user to AsyncStorage, navigate to `/(app)/dashboard`
- Show error `Text` on failure (401)
- Link to Register screen

---

### Register (`/(auth)/register`)
- Fields: name, email, password, role (Picker: student / warden)
- When role = student, show: rollNumber, branch, year (numeric input)
- Register button → calls `registerUser()`
- On success: navigate to login
- Show inline validation errors

---

### Dashboard (`/(app)/dashboard`)
- Header: "Welcome, {name}" with role badge (Warden/Student)
- Grid of `Card` components linking to each module
- Warden cards: Students, Rooms, Outings, Complaints, Attendance, Food Menu
- Student cards: My Profile, Rooms, Outings, My Complaints, My Attendance, Food Menu
- Logout button in header

---

### Rooms (`/(app)/rooms/index`)

Both roles — read:
- `FlatList` of room cards: roomNumber, block, floor, capacity, occupied
- Tap card → navigate to `/(app)/rooms/[id]`
- Show availability: capacity - occupied

Warden only — write (FAB or header button):
- "Add Room" → bottom sheet or modal form: roomNumber, block, floor, capacity
- Submit → `createRoom()`
- Long-press card → Edit / Delete options
- Show `Alert` confirmation before delete
- Show 409 error if roomNumber already exists

---

### Room Detail (`/(app)/rooms/[id]`)
- Display all room fields
- Warden only: Edit button → inline edit form → `updateRoom()`

---

### Students (`/(app)/students/index`) — Warden only

- `FlatList` of student cards: name, rollNumber, branch, year, room
- Tap → `/(app)/students/[id]`
- "Assign Room" button per card → modal with `Picker` of rooms → `assignRoom()`
- Delete button per card → Alert confirm → `deleteStudent()`

### Student Detail (`/(app)/students/[id]`) — Warden only
- Display full student info + user info + room
- Edit form: branch, year → `updateStudent()`

---

### Profile (`/(app)/profile`) — Student only
- Shows logged-in student's data: name, email, rollNumber, branch, year, room
- Edit form for branch and year → `updateStudent()`

---

### Outings (`/(app)/outings/index`)

Student view:
- `FlatList` of own outings with `StatusBadge` (Pending/Approved/Rejected)
- FAB → `/(app)/outings/create`

Warden view:
- `FlatList` of all outings with student name + `StatusBadge`
- Swipe actions or inline buttons: Approve / Reject
- Disable both if status is already Approved or Rejected

### Create Outing (`/(app)/outings/create`) — Student only
- Fields: destination, reason, outingDate (DatePicker), outTime (text HH:MM), inTime (text HH:MM)
- Submit → `createOuting()`
- On success: navigate back

---

### Complaints (`/(app)/complaints/index`)

Student view:
- "New Complaint" button → modal or navigate to create form
- List of own submitted complaints with status badge
- (Students do not see all complaints — only their own submissions)

Warden view:
- `FlatList` of all complaints: title, student name, status badge
- Tap complaint → detail modal or screen
- `Picker` to update status → `updateComplaintStatus()`
- Status colors: PENDING=yellow, IN_PROGRESS=blue, RESOLVED=green, REJECTED=red

### Create Complaint (`/(app)/complaints/create`) — Student only
- Fields: title (TextInput), description (multiline TextInput)
- Submit → `createComplaint()`
- Show success `Alert` on submit

---

### Attendance (`/(app)/attendance/index`)

Student view:
- `FlatList` of own attendance records: date, PRESENT (green) / ABSENT (red)
- Summary: Total Present / Total Absent count at top

Warden view:
- `FlatList` of all attendance records: student name, date, status
- "Mark Attendance" FAB → bottom sheet form:
  - `Picker` for student (from `getStudents()`)
  - Date picker for date
  - Toggle/Picker for PRESENT / ABSENT
  - Submit → `markAttendance()`
- Show 409 conflict error if already marked
- Swipe to edit → `updateAttendance()`

---

### Food Menu (`/(app)/food-menu/index`)

Both roles — read:
- Show as a vertical list or table layout: day, breakfast, lunch, snacks, dinner
- Days order: Monday → Sunday
- Show "Not set" if a day has no menu

Warden only — write:
- FAB → "Add Menu" modal form:
  - `Picker` for day (MONDAY–SUNDAY)
  - TextInput for breakfast, lunch, snacks, dinner
  - Submit → `createFoodMenu()`
- Swipe or long-press to Edit → `updateFoodMenu()`
- Delete → Alert confirm → `deleteFoodMenu()`
- Show 409 if day already exists

---

## Shared Component Requirements

### `StatusBadge` (`src/components/StatusBadge.tsx`)
- Accepts `status` string and maps to background color
- Outing: Pending=yellow, Approved=green, Rejected=red
- Complaint: PENDING=yellow, IN_PROGRESS=blue, RESOLVED=green, REJECTED=red
- Attendance: PRESENT=green, ABSENT=red

### `RoleGuard` (`src/components/RoleGuard.tsx`)
- Accepts `role: 'warden' | 'student'` and `children`
- Renders children only if logged-in user role matches
- Used to hide write buttons from students

### `Loading` (already scaffolded)
- Full-screen `ActivityIndicator` while API calls are in progress

### `Input` (already scaffolded)
- Styled `TextInput` wrapper with label and error message support

### `Button` (already scaffolded)
- Primary and secondary variants, with loading/disabled state

### `Card` (already scaffolded)
- Touchable card container with shadow

---

## Colors (`src/constants/colors.ts`)

```typescript
export const colors = {
  primary: '#4F46E5',      // indigo — main actions
  bg: '#F9FAFB',           // page background
  surface: '#FFFFFF',      // card background
  text: '#111827',         // primary text
  muted: '#6B7280',        // secondary text
  border: '#E5E7EB',       // dividers

  // Status colors
  pending: '#F59E0B',      // yellow
  approved: '#10B981',     // green
  rejected: '#EF4444',     // red
  inProgress: '#3B82F6',   // blue
  present: '#10B981',
  absent: '#EF4444',
};
```

---

## Config (`src/constants/config.ts`)

```typescript
export const API_URL = 'http://192.168.x.x:3000'; // replace with your LAN IP
```

---

## Data Types (`src/types/index.ts`) — create this file

```typescript
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'warden';
}

export interface Student {
  id: number;
  rollNumber: string;
  branch: string;
  year: number;
  userId: number;
  roomId: number | null;
  user?: User;
  room?: Room | null;
}

export interface Room {
  id: number;
  roomNumber: string;
  block: string;
  floor: number;
  capacity: number;
  occupied: number;
}

export interface Outing {
  id: number;
  destination: string;
  reason: string;
  outingDate: string;
  outTime: string;
  inTime: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  studentId: number;
}

export interface Complaint {
  id: number;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  studentId: number;
}

export interface Attendance {
  id: number;
  date: string;
  status: 'PRESENT' | 'ABSENT';
  studentId: number;
}

export interface FoodMenu {
  id: number;
  day: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  breakfast: string;
  lunch: string;
  snacks: string;
  dinner: string;
}
```

---

## Error Handling

| HTTP Status | Behavior |
|---|---|
| 400 | Show validation error from `response.message` in an `Alert` or inline |
| 401 | Clear AsyncStorage, redirect to login with "Session expired" message |
| 403 | Show `Alert`: "You don't have permission" |
| 404 | Show `Alert`: "Not found" |
| 409 | Show `Alert` with the specific conflict message from API |
| 500 | Show `Alert`: "Server error. Please try again." |

---

## Packages to Install

```bash
npm install @react-native-async-storage/async-storage
npm install axios
npm install @reduxjs/toolkit react-redux
npm install @react-native-picker/picker
npm install @react-navigation/native @react-navigation/bottom-tabs
```

Note: Expo Router is already included via the `expo` package. Navigation between `(auth)` and `(app)` groups is handled automatically by file-based routing.
