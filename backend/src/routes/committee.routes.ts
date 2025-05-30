import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get all committees (authenticated users)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const committees = await prisma.committee.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { members: true, meetings: true },
        },
      },
    });

    res.json(committees);
  } catch (error) {
    console.error('Get committees error:', error);
    res.status(500).json({ message: 'Error fetching committees' });
  }
});

// Get user's committees
router.get('/my-committees', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const committees = await prisma.committeeMember.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        committee: {
          include: {
            _count: {
              select: { members: true, meetings: true },
            },
          },
        },
      },
    });

    res.json(committees.map(cm => cm.committee));
  } catch (error) {
    console.error('Get my committees error:', error);
    res.status(500).json({ message: 'Error fetching user committees' });
  }
});

// Get single committee details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const committee = await prisma.committee.findUnique({
      where: { id },
      include: {
        members: {
          where: { isActive: true },
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
        meetings: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    if (!committee) {
      return res.status(404).json({ message: 'Committee not found' });
    }

    res.json(committee);
  } catch (error) {
    console.error('Get committee error:', error);
    res.status(500).json({ message: 'Error fetching committee details' });
  }
});

// Create new committee (admin only)
router.post('/', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, meetingDay, meetingTime } = req.body;

    if (!name || !meetingDay || !meetingTime) {
      return res.status(400).json({ message: 'Name, meeting day, and meeting time are required' });
    }

    const committee = await prisma.committee.create({
      data: {
        name,
        description,
        meetingDay,
        meetingTime,
      },
    });

    res.status(201).json({
      message: 'Committee created successfully',
      committee,
    });
  } catch (error) {
    console.error('Create committee error:', error);
    res.status(500).json({ message: 'Error creating committee' });
  }
});

// Add member to committee (admin only)
router.post('/:id/members', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if already a member
    const existingMember = await prisma.committeeMember.findUnique({
      where: {
        userId_committeeId: {
          userId,
          committeeId: id,
        },
      },
    });

    if (existingMember) {
      if (existingMember.isActive) {
        return res.status(400).json({ message: 'User is already a member of this committee' });
      }
      
      // Reactivate membership
      const member = await prisma.committeeMember.update({
        where: { id: existingMember.id },
        data: { isActive: true },
      });
      
      return res.json({
        message: 'Membership reactivated successfully',
        member,
      });
    }

    // Create new membership
    const member = await prisma.committeeMember.create({
      data: {
        userId,
        committeeId: id,
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

    res.status(201).json({
      message: 'Member added successfully',
      member,
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Error adding member to committee' });
  }
});

// Remove member from committee (admin only)
router.delete('/:id/members/:userId', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId } = req.params;

    const member = await prisma.committeeMember.updateMany({
      where: {
        committeeId: id,
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    if (member.count === 0) {
      return res.status(404).json({ message: 'Member not found in committee' });
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Error removing member from committee' });
  }
});

export default router; 