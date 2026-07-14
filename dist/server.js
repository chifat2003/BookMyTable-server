"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const db_1 = require("./config/db");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.send('Welcome to the BookMyTable API!');
});
app.get('/ping', (req, res) => {
    res.send('pong');
});
app.get('/ping/db', async (req, res) => {
    try {
        await (0, db_1.getDB)().command({ ping: 1 });
        res.json({ ok: true, message: 'MongoDB connection is healthy' });
    }
    catch (error) {
        res.status(500).json({ ok: false, message: 'MongoDB connection failed' });
    }
});
app.get('/restaurants', async (req, res) => {
    try {
        const restaurants = await (0, db_1.getDB)()
            .collection('restaurants')
            .find()
            .sort({ createdAt: -1 })
            .toArray();
        res.json({
            ok: true,
            data: restaurants,
        });
    }
    catch (error) {
        res.status(500).json({
            ok: false,
            message: 'Failed to fetch restaurants',
        });
    }
});
app.post('/restaurants', async (req, res) => {
    try {
        const { name, cuisineType, address, location, phone, email, website, imageUrls = [], priceRange, capacity, description, } = req.body;
        const requiredFields = {
            name,
            cuisineType,
            address,
            location,
            phone,
            email,
            priceRange,
            capacity,
            description,
        };
        const missingFields = Object.entries(requiredFields)
            .filter(([, value]) => value === undefined || value === null || value === '')
            .map(([field]) => field);
        if (missingFields.length > 0) {
            res.status(400).json({
                ok: false,
                message: 'Missing required fields',
                missingFields,
            });
            return;
        }
        const restaurant = {
            name,
            cuisineType,
            address,
            location,
            phone,
            email,
            website: website || '',
            imageUrls: Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : [],
            priceRange,
            capacity: Number(capacity),
            description,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const result = await (0, db_1.getDB)().collection('restaurants').insertOne(restaurant);
        res.status(201).json({
            ok: true,
            message: 'Restaurant submitted successfully',
            data: {
                _id: result.insertedId,
                ...restaurant,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            ok: false,
            message: 'Failed to submit restaurant',
        });
    }
});
exports.default = app;
//# sourceMappingURL=server.js.map