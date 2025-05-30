import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get meetings for a committee
router.get('/committee/:committeeId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { committeeId } = req.params;
    const { status, limit = '10', offset = '0' } = req.query;

    const where: any = { committeeId };
    if (status) {
      where.status = status;
    }

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        committee: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { attendances: true },
        },
      },
      orderBy: { date: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.meeting.count({ where });

    res.json({
      meetings,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ message: 'Error fetching meetings' });
  }
});

// Get upcoming meetings for logged-in user
router.get('/my-upcoming', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const now = new Date();

    // Get user's committees
    const userCommittees = await prisma.committeeMember.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: { committeeId: true },
    });

    const committeeIds = userCommittees.map(uc => uc.committeeId);

    const meetings = await prisma.meeting.findMany({
      where: {
        committeeId: { in: committeeIds },
        date: { gte: now },
        status: { in: ['SCHEDULED', 'ONGOING'] },
      },
      include: {
        committee: {
          select: {
            id: true,
            name: true,
            meetingDay: true,
            meetingTime: true,
          },
        },
        attendances: {
          where: { userId },
          select: {
            id: true,
            status: true,
            updateCount: true,
          },
        },
      },
      orderBy: { date: 'asc' },
      take: 10,
    });

    res.json(meetings);
  } catch (error) {
    console.error('Get upcoming meetings error:', error);
    res.status(500).json({ message: 'Error fetching upcoming meetings' });
  }
});

// Create a new meeting (admin only)
router.post('/', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { committeeId, date, notes } = req.body;

    if (!committeeId || !date) {
      return res.status(400).json({ message: 'Committee ID and date are required' });
    }

    const meeting = await prisma.meeting.create({
      data: {
        committeeId,
        date: new Date(date),
        notes,
      },
      include: {
        committee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Meeting created successfully',
      meeting,
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ message: 'Error creating meeting' });
  }
});

// Update meeting status (admin only)
router.patch('/:id/status', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Valid status is required' });
    }

    const meeting = await prisma.meeting.update({
      where: { id },
      data: { status },
      include: {
        committee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({
      message: 'Meeting status updated successfully',
      meeting,
    });
  } catch (error) {
    console.error('Update meeting status error:', error);
    res.status(500).json({ message: 'Error updating meeting status' });
  }
});

// Get meeting details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        committee: true,
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
    });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Check if user is a member of the committee or admin
    const isMember = await prisma.committeeMember.findFirst({
      where: {
        committeeId: meeting.committeeId,
        userId,
        isActive: true,
      },
    });

    if (!isMember && req.user!.role !== 'ADMIN') {
      // Return limited information for non-members
      return res.json({
        id: meeting.id,
        date: meeting.date,
        status: meeting.status,
        committee: {
          id: meeting.committee.id,
          name: meeting.committee.name,
        },
      });
    }

    res.json(meeting);
  } catch (error) {
    console.error('Get meeting details error:', error);
    res.status(500).json({ message: 'Error fetching meeting details' });
  }
});

export default router; 