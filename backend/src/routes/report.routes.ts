import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get attendance report for a committee
router.get('/committee/:committeeId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { committeeId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Check if user has access to this committee
    const isMember = await prisma.committeeMember.findFirst({
      where: {
        committeeId,
        userId: req.user!.id,
        isActive: true,
      },
    });

    if (!isMember && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get committee details
    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
    });

    if (!committee) {
      return res.status(404).json({ message: 'Committee not found' });
    }

    // Get all meetings in the date range
    const meetings = await prisma.meeting.findMany({
      where: {
        committeeId,
        date: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
        status: { in: ['COMPLETED', 'ONGOING'] },
      },
      include: {
        attendances: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Get all committee members
    const members = await prisma.committeeMember.findMany({
      where: {
        committeeId,
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

    // Calculate attendance statistics for each member
    const memberStats = members.map(member => {
      const memberAttendances = meetings.map(meeting => {
        const attendance = meeting.attendances.find(a => a.userId === member.userId);
        return {
          meetingId: meeting.id,
          date: meeting.date,
          status: attendance?.status || 'ABSENT',
        };
      });

      const stats = {
        present: memberAttendances.filter(a => a.status === 'PRESENT').length,
        legalLate: memberAttendances.filter(a => a.status === 'LEGAL_LATE').length,
        late: memberAttendances.filter(a => a.status === 'LATE').length,
        leave: memberAttendances.filter(a => a.status === 'LEAVE').length,
        absent: memberAttendances.filter(a => a.status === 'ABSENT').length,
      };

      return {
        user: member.user,
        attendances: memberAttendances,
        statistics: {
          ...stats,
          total: meetings.length,
          attendanceRate: meetings.length > 0 
            ? ((stats.present + stats.legalLate) / meetings.length * 100).toFixed(2) + '%'
            : '0%',
        },
      };
    });

    res.json({
      committee: {
        id: committee.id,
        name: committee.name,
        description: committee.description,
      },
      dateRange: {
        start: startDate,
        end: endDate,
      },
      totalMeetings: meetings.length,
      members: memberStats,
    });
  } catch (error) {
    console.error('Committee report error:', error);
    res.status(500).json({ message: 'Error generating committee report' });
  }
});

// Get attendance report for a specific member
router.get('/member/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, committeeId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Check authorization
    if (userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build query for user's committees
    const membershipWhere: any = {
      userId,
      isActive: true,
    };

    if (committeeId) {
      membershipWhere.committeeId = committeeId;
    }

    // Get user's committees
    const memberships = await prisma.committeeMember.findMany({
      where: membershipWhere,
      include: {
        committee: true,
      },
    });

    const committeeIds = memberships.map(m => m.committeeId);

    // Get all meetings for these committees in the date range
    const meetings = await prisma.meeting.findMany({
      where: {
        committeeId: { in: committeeIds },
        date: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
        status: { in: ['COMPLETED', 'ONGOING'] },
      },
      include: {
        committee: {
          select: {
            id: true,
            name: true,
          },
        },
        attendances: {
          where: { userId },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Group meetings by committee
    const committeeReports = memberships.map(membership => {
      const committeeMeetings = meetings.filter(m => m.committeeId === membership.committeeId);
      
      const attendanceData = committeeMeetings.map(meeting => ({
        meetingId: meeting.id,
        date: meeting.date,
        status: meeting.attendances[0]?.status || 'ABSENT',
      }));

      const stats = {
        present: attendanceData.filter(a => a.status === 'PRESENT').length,
        legalLate: attendanceData.filter(a => a.status === 'LEGAL_LATE').length,
        late: attendanceData.filter(a => a.status === 'LATE').length,
        leave: attendanceData.filter(a => a.status === 'LEAVE').length,
        absent: attendanceData.filter(a => a.status === 'ABSENT').length,
      };

      return {
        committee: membership.committee,
        meetings: attendanceData,
        statistics: {
          ...stats,
          total: committeeMeetings.length,
          attendanceRate: committeeMeetings.length > 0
            ? ((stats.present + stats.legalLate) / committeeMeetings.length * 100).toFixed(2) + '%'
            : '0%',
        },
      };
    });

    // Calculate overall statistics
    const overallStats = committeeReports.reduce((acc, report) => {
      acc.present += report.statistics.present;
      acc.legalLate += report.statistics.legalLate;
      acc.late += report.statistics.late;
      acc.leave += report.statistics.leave;
      acc.absent += report.statistics.absent;
      acc.total += report.statistics.total;
      return acc;
    }, { present: 0, legalLate: 0, late: 0, leave: 0, absent: 0, total: 0 });

    res.json({
      user,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      committees: committeeReports,
      overallStatistics: {
        ...overallStats,
        attendanceRate: overallStats.total > 0
          ? ((overallStats.present + overallStats.legalLate) / overallStats.total * 100).toFixed(2) + '%'
          : '0%',
      },
    });
  } catch (error) {
    console.error('Member report error:', error);
    res.status(500).json({ message: 'Error generating member report' });
  }
});

export default router; 