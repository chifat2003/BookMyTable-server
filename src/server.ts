import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';

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

    // Normalize cuisineType → cuisine for older documents
    const normalized = restaurants.map((r) => ({
      ...r,
      cuisine: r.cuisine ?? r.cuisineType ?? '',
    }));

    res.json({
      ok: true,
      data: normalized,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch restaurants',
    });
  }
});

app.get('/restaurants/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ ok: false, message: 'Invalid restaurant ID' });
      return;
    }

    const doc = await getDB()
      .collection('restaurants')
      .findOne({ _id: new ObjectId(id) });

    if (!doc) {
      res.status(404).json({ ok: false, message: 'Restaurant not found' });
      return;
    }

    // Ensure all detail fields exist (new docs store them; old docs may not)
    const restaurant = {
      tags: [],
      hours: [],
      menu: [],
      reviews: [],
      rating: 0,
      reviewCount: 0,
      openNow: false,
      parkingAvailable: false,
      reservationRequired: false,
      website: '',
      ...doc,
      cuisine: doc.cuisine ?? doc.cuisineType ?? '',
    };

    res.json({ ok: true, data: restaurant });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to fetch restaurant' });
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
  tags?: string[];
  hours?: { day: string; hours: string }[];
  menu?: { category: string; items: { name: string; description: string; price: string }[] }[];
  parkingAvailable?: boolean;
  reservationRequired?: boolean;
};

type ReservationRequestBody = {
  restaurantId?: string;
  name?: string;
  phone?: string;
  email?: string;
  date?: string;
  time?: string;
  guests?: string;
  note?: string;
};

app.get('/reservations', async (req: Request, res: Response) => {
  try {
    const reservations = await getDB()
      .collection('reservations')
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      ok: true,
      data: reservations,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch reservations',
    });
  }
});

app.get('/reservations/restaurant/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params as { restaurantId: string };

    if (!ObjectId.isValid(restaurantId)) {
      res.status(400).json({ ok: false, message: 'Invalid restaurant ID' });
      return;
    }

    const reservations = await getDB()
      .collection('reservations')
      .find({ restaurantId: new ObjectId(restaurantId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      ok: true,
      data: reservations,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch reservations',
    });
  }
});

app.get('/reservations/user/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params as { email: string };

    const reservations = await getDB()
      .collection('reservations')
      .find({ email })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      ok: true,
      data: reservations,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch reservations',
    });
  }
});

app.post('/reservations', async (req: Request, res: Response) => {
  try {
    const {
      restaurantId,
      name,
      phone,
      email,
      date,
      time,
      guests,
      note,
    } = req.body as ReservationRequestBody;

    if (!restaurantId || !ObjectId.isValid(restaurantId)) {
      res.status(400).json({ ok: false, message: 'Invalid restaurant ID' });
      return;
    }

    const requiredFields = {
      restaurantId,
      name,
      phone,
      email,
      date,
      time,
      guests,
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

    const reservation = {
      restaurantId: new ObjectId(restaurantId),
      name,
      phone,
      email,
      date,
      time,
      guests,
      note: note || '',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await getDB().collection('reservations').insertOne(reservation);

    res.status(201).json({
      ok: true,
      message: 'Reservation created successfully',
      data: {
        _id: result.insertedId,
        ...reservation,
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Failed to create reservation',
    });
  }
});

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
      tags = [],
      hours = [],
      menu = [],
      parkingAvailable = false,
      reservationRequired = false,
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
      cuisine: cuisineType,
      address,
      location,
      phone,
      email,
      website: website || '',
      imageUrls: Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : [],
      priceRange,
      capacity: Number(capacity),
      description,
      tags,
      hours,
      menu,
      reviews: [],
      rating: 0,
      reviewCount: 0,
      openNow: false,
      parkingAvailable,
      reservationRequired,
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
