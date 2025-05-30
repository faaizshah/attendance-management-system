import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Mark attendance for a meeting
router.post('/mark', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId, status } = req.body;
    const userId = req.user!.id;

    if (!meetingId || !status) {
      return res.status(400).json({ message: 'Meeting ID and status are required' });
    }

    // Validate attendance status
    const validStatuses = ['PRESENT', 'LEGAL_LATE', 'LATE', 'LEAVE', 'ABSENT'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid attendance status' });
    }

    // Check if user is a member of the committee
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        committee: {
          include: {
            members: {
              where: {
                userId,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (meeting.committee.members.length === 0) {
      return res.status(403).json({ message: 'You are not a member of this committee' });
    }

    // Check if meeting is ongoing
    if (meeting.status !== 'ONGOING') {
      return res.status(400).json({ message: 'Cannot mark attendance for this meeting' });
    }

    // Check if attendance already exists
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        meetingId_userId: {
          meetingId,
          userId,
        },
      },
    });

    if (existingAttendance) {
      // Check if update is allowed (only once)
      if (existingAttendance.updateCount >= 1) {
        return res.status(400).json({ message: 'You have already updated your attendance once' });
      }

      // Update attendance
      const attendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          status,
          updateCount: existingAttendance.updateCount + 1,
        },
      });

      return res.json({
        message: 'Attendance updated successfully',
        attendance,
      });
    }

    // Create new attendance
    const attendance = await prisma.attendance.create({
      data: {
        meetingId,
        userId,
        status,
      },
    });

    res.status(201).json({
      message: 'Attendance marked successfully',
      attendance,
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Error marking attendance' });
  }
});

// Get user's attendance for a specific meeting
router.get('/meeting/:meetingId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user!.id;

    const attendance = await prisma.attendance.findUnique({
      where: {
        meetingId_userId: {
          meetingId,
          userId,
        },
      },
      include: {
        meeting: {
          include: {
            committee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance not found' });
    }

    res.json(attendance);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Error fetching attendance' });
  }
});

// Get all attendance for a specific meeting (committee members only)
router.get('/meeting/:meetingId/all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user!.id;

    // Check if user is a member of the committee
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        committee: {
          include: {
            members: {
              where: {
                userId,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (meeting.committee.members.length === 0 && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'You are not authorized to view this data' });
    }

    // Get all attendance records with member details
    const attendances = await prisma.attendance.findMany({
      where: { meetingId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    // Get all committee members
    const allMembers = await prisma.committeeMember.findMany({
      where: {
        committeeId: meeting.committeeId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create a map of attendance
    const attendanceMap = new Map(attendances.map(a => [a.userId, a]));

    // Combine members with their attendance status
    const memberAttendance = allMembers.map(member => ({
      user: member.user,
      attendance: attendanceMap.get(member.userId) || null,
    }));

    res.json({
      meeting: {
        id: meeting.id,
        date: meeting.date,
        status: meeting.status,
        committee: meeting.committee,
      },
      memberAttendance,
    });
  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({ message: 'Error fetching attendance records' });
  }
});

export default router; 