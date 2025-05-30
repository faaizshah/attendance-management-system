# Attendance Management System - Backend

This is the backend API for the Attendance Management System built with Express.js, TypeScript, Prisma, and PostgreSQL.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env` (create manually)
   - Update the following variables:
     ```
     DATABASE_URL="postgresql://username:password@localhost:5432/attendance_db"
     JWT_SECRET="your-secret-key"
     PORT=5000
     FRONTEND_URL=http://localhost:3000
     ```

3. **Set up the database:**
   ```bash
   # Generate Prisma client
   npm run prisma:generate

   # Run database migrations
   npm run prisma:migrate
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Committees
- `GET /api/committees` - Get all committees
- `GET /api/committees/my-committees` - Get user's committees
- `GET /api/committees/:id` - Get committee details
- `POST /api/committees` - Create committee (admin only)
- `POST /api/committees/:id/members` - Add member to committee (admin only)
- `DELETE /api/committees/:id/members/:userId` - Remove member (admin only)

### Meetings
- `GET /api/meetings/committee/:committeeId` - Get meetings for a committee
- `GET /api/meetings/my-upcoming` - Get user's upcoming meetings
- `GET /api/meetings/:id` - Get meeting details
- `POST /api/meetings` - Create meeting (admin only)
- `PATCH /api/meetings/:id/status` - Update meeting status (admin only)

### Attendance
- `POST /api/attendance/mark` - Mark attendance
- `GET /api/attendance/meeting/:meetingId` - Get user's attendance for a meeting
- `GET /api/attendance/meeting/:meetingId/all` - Get all attendance for a meeting

### Reports
- `GET /api/reports/committee/:committeeId` - Get committee attendance report
- `GET /api/reports/member/:userId` - Get member attendance report

## Database Schema

The database consists of the following main tables:
- Users
- Committees
- CommitteeMembers
- Meetings
- Attendance

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio for database management 