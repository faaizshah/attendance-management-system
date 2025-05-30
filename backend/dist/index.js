"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
// Load environment variables
dotenv_1.default.config();
// Initialize Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Initialize Prisma Client
exports.prisma = new client_1.PrismaClient();
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const committee_routes_1 = __importDefault(require("./routes/committee.routes"));
const meeting_routes_1 = __importDefault(require("./routes/meeting.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Attendance Management System API is running' });
});
app.use('/api/auth', auth_routes_1.default);
app.use('/api/committees', committee_routes_1.default);
app.use('/api/meetings', meeting_routes_1.default);
app.use('/api/attendance', attendance_routes_1.default);
app.use('/api/reports', report_routes_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});
// Start server
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
    await exports.prisma.$disconnect();
});
//# sourceMappingURL=index.js.map