# Attendance Management System

A comprehensive web application for tracking and managing committee meeting attendance in organizations.

## Features

### Core Features Implemented:
1. **Attendance Recording** - Members can record their attendance at weekly committee meetings
2. **Attendance Options** - Present, Legal Late, Late, Leave, and Absent
3. **Multiple Committees** - Support for multiple committees with varying schedules
4. **Self-Service Interface** - Members can mark their own attendance
5. **One-Time Update** - Members can update their attendance once after initial marking
6. **Flexible Reporting** - Generate reports by committee or member for any time period

### Technical Features:
- **Authentication & Authorization** - Secure login system with JWT tokens
- **Role-Based Access** - Admin and Member roles with different permissions
- **Responsive Design** - Works on desktop and mobile devices
- **Real-time Updates** - Immediate feedback on attendance marking
- **Data Integrity** - PostgreSQL database with proper constraints

## Technology Stack

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **PostgreSQL** database
- **Prisma ORM** for database management
- **JWT** for authentication
- **bcrypt** for password hashing

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **React Hook Form** for form handling
- **Axios** for API calls
- **React Hot Toast** for notifications

## Project Structure

```
attendance-management-system/
├── backend/                # Express.js backend API
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth & error handling
│   │   ├── utils/         # Utility functions
│   │   └── index.ts       # Server entry point
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── package.json
│
├── frontend/              # Next.js frontend
│   ├── app/              # App router pages
│   ├── components/       # React components
│   ├── lib/              # API clients & utilities
│   └── package.json
│
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd attendance-management-system/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/attendance_db"
   JWT_SECRET="your-secret-key"
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   ```

4. Set up the database:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd attendance-management-system/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. **Register/Login**: Create an account or login with existing credentials
2. **View Committees**: See all committees you're a member of
3. **Mark Attendance**: When a meeting is ongoing, mark your attendance
4. **Update Attendance**: You can update your attendance once if needed
5. **View Reports**: Generate attendance reports for committees or yourself

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Committees
- `GET /api/committees` - Get all committees
- `GET /api/committees/my-committees` - Get user's committees
- `POST /api/committees` - Create committee (Admin)
- `POST /api/committees/:id/members` - Add member (Admin)

### Meetings
- `GET /api/meetings/my-upcoming` - Get upcoming meetings
- `POST /api/meetings` - Create meeting (Admin)
- `PATCH /api/meetings/:id/status` - Update meeting status (Admin)

### Attendance
- `POST /api/attendance/mark` - Mark attendance
- `GET /api/attendance/meeting/:meetingId` - Get attendance for meeting

### Reports
- `GET /api/reports/committee/:id` - Committee attendance report
- `GET /api/reports/member/:id` - Member attendance report

## Database Schema

- **Users** - System users with authentication
- **Committees** - Organization committees
- **CommitteeMembers** - Member-committee relationships
- **Meetings** - Scheduled committee meetings
- **Attendance** - Attendance records with status

## Development

### Adding New Features
1. Define the database schema in `backend/prisma/schema.prisma`
2. Create API routes in `backend/src/routes/`
3. Add frontend components in `frontend/components/`
4. Create pages in `frontend/app/`

### Running Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

## Production Deployment

1. Build the backend:
   ```bash
   cd backend && npm run build
   ```

2. Build the frontend:
   ```bash
   cd frontend && npm run build
   ```

3. Set production environment variables
4. Deploy to your preferred hosting platform

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License. 