import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';

import { getDB } from './config/db';

const app: Express = express();

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to the BookMyTable API!');
});

app.get('/ping', (req: Request, res: Response) => {
  res.send('pong');
});

app.get('/ping/db', async (req: Request, res: Response) => {
  try {
    await getDB().command({ ping: 1 });
    res.json({ ok: true, message: 'MongoDB connection is healthy' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'MongoDB connection failed' });
  }
});

app.get('/restaurants', async (req: Request, res: Response) => {
  try {
    const restaurants = await getDB()
      .collection('restaurants')
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      ok: true,
      data: restaurants,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch restaurants',
    });
  }
});

type RestaurantRequestBody = {
  name?: string;
  cuisineType?: string;
  address?: string;
  location?: string;
  phone?: string;
  email?: string;
  website?: string;
  imageUrls?: string[];
  priceRange?: string;
  capacity?: number | string;
  description?: string;
};

app.post('/restaurants', async (req: Request, res: Response) => {
  try {
    const {
      name,
      cuisineType,
      address,
      location,
      phone,
      email,
      website,
      imageUrls = [],
      priceRange,
      capacity,
      description,
    } = req.body as RestaurantRequestBody;

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

    const result = await getDB().collection('restaurants').insertOne(restaurant);

    res.status(201).json({
      ok: true,
      message: 'Restaurant submitted successfully',
      data: {
        _id: result.insertedId,
        ...restaurant,
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Failed to submit restaurant',
    });
  }
});

export default app;
