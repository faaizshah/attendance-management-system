"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Mark attendance for a meeting
router.post('/mark', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { meetingId, status } = req.body;
        const userId = req.user.id;
        if (!meetingId || !status) {
            return res.status(400).json({ message: 'Meeting ID and status are required' });
        }
        // Validate attendance status
        const validStatuses = ['PRESENT', 'LEGAL_LATE', 'LATE', 'LEAVE', 'ABSENT'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid attendance status' });
        }
        // Check if user is a member of the committee
        const meeting = await index_1.prisma.meeting.findUnique({
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
        const existingAttendance = await index_1.prisma.attendance.findUnique({
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
            const attendance = await index_1.prisma.attendance.update({
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
        const attendance = await index_1.prisma.attendance.create({
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
    }
    catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({ message: 'Error marking attendance' });
    }
});
// Get user's attendance for a specific meeting
router.get('/meeting/:meetingId', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user.id;
        const attendance = await index_1.prisma.attendance.findUnique({
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
    }
    catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ message: 'Error fetching attendance' });
    }
});
// Get all attendance for a specific meeting (committee members only)
router.get('/meeting/:meetingId/all', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user.id;
        // Check if user is a member of the committee
        const meeting = await index_1.prisma.meeting.findUnique({
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
        if (meeting.committee.members.length === 0 && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'You are not authorized to view this data' });
        }
        // Get all attendance records with member details
        const attendances = await index_1.prisma.attendance.findMany({
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
        const allMembers = await index_1.prisma.committeeMember.findMany({
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
    }
    catch (error) {
        console.error('Get all attendance error:', error);
        res.status(500).json({ message: 'Error fetching attendance records' });
    }
});
exports.default = router;
//# sourceMappingURL=attendance.routes.js.map