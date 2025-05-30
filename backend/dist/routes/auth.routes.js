"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const auth_utils_1 = require("../utils/auth.utils");
const router = (0, express_1.Router)();
// Register new user
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        // Validate input
        if (!email || !password || !name) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        // Check if user already exists
        const existingUser = await index_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Hash password and create user
        const hashedPassword = await (0, auth_utils_1.hashPassword)(password);
        const user = await index_1.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });
        // Generate token
        const token = (0, auth_utils_1.generateToken)(user.id);
        res.status(201).json({
            message: 'User created successfully',
            user,
            token,
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
});
// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        // Find user
        const user = await index_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Verify password
        const isPasswordValid = await (0, auth_utils_1.comparePasswords)(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Generate token
        const token = (0, auth_utils_1.generateToken)(user.id);
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            token,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error during login' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map