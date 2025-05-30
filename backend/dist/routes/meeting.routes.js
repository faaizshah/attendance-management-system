"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Get meetings for a committee
router.get('/committee/:committeeId', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { committeeId } = req.params;
        const { status, limit = '10', offset = '0' } = req.query;
        const where = { committeeId };
        if (status) {
            where.status = status;
        }
        const meetings = await index_1.prisma.meeting.findMany({
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
            take: parseInt(limit),
            skip: parseInt(offset),
        });
        const total = await index_1.prisma.meeting.count({ where });
        res.json({
            meetings,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
            },
        });
    }
    catch (error) {
        console.error('Get meetings error:', error);
        res.status(500).json({ message: 'Error fetching meetings' });
    }
});
// Get upcoming meetings for logged-in user
router.get('/my-upcoming', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        // Get user's committees
        const userCommittees = await index_1.prisma.committeeMember.findMany({
            where: {
                userId,
                isActive: true,
            },
            select: { committeeId: true },
        });
        const committeeIds = userCommittees.map(uc => uc.committeeId);
        const meetings = await index_1.prisma.meeting.findMany({
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
    }
    catch (error) {
        console.error('Get upcoming meetings error:', error);
        res.status(500).json({ message: 'Error fetching upcoming meetings' });
    }
});
// Create a new meeting (admin only)
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['ADMIN']), async (req, res) => {
    try {
        const { committeeId, date, notes } = req.body;
        if (!committeeId || !date) {
            return res.status(400).json({ message: 'Committee ID and date are required' });
        }
        const meeting = await index_1.prisma.meeting.create({
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
    }
    catch (error) {
        console.error('Create meeting error:', error);
        res.status(500).json({ message: 'Error creating meeting' });
    }
});
// Update meeting status (admin only)
router.patch('/:id/status', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Valid status is required' });
        }
        const meeting = await index_1.prisma.meeting.update({
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
    }
    catch (error) {
        console.error('Update meeting status error:', error);
        res.status(500).json({ message: 'Error updating meeting status' });
    }
});
// Get meeting details
router.get('/:id', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const meeting = await index_1.prisma.meeting.findUnique({
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
        const isMember = await index_1.prisma.committeeMember.findFirst({
            where: {
                committeeId: meeting.committeeId,
                userId,
                isActive: true,
            },
        });
        if (!isMember && req.user.role !== 'ADMIN') {
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
    }
    catch (error) {
        console.error('Get meeting details error:', error);
        res.status(500).json({ message: 'Error fetching meeting details' });
    }
});
exports.default = router;
//# sourceMappingURL=meeting.routes.js.map