import { Router } from 'express';
import type { Request, Response } from 'express';
import { bengaluruNodes, keyCorridors } from '../../data/bengaluruTransit.ts';

export const trafficRouter = Router();

trafficRouter.get('/bengaluru-corridors', (req: Request, res: Response) => {
  const tomtomKey = process.env.TOMTOM_API_KEY || '';
  const isTomTomConfigured = Boolean(tomtomKey && tomtomKey !== 'YOUR_TOMTOM_KEY');

  res.json({
    city: 'Bengaluru, Karnataka, India',
    isTomTomConfigured,
    tomtomStatusMessage: isTomTomConfigured
      ? 'TomTom Routing & Traffic API active'
      : 'Live simulated Bengaluru mobility grid active. (Provide TOMTOM_API_KEY in .env to activate direct satellite traffic overlays)',
    nodes: bengaluruNodes,
    corridors: keyCorridors,
    peakHours: '08:30 AM – 11:30 AM & 05:30 PM – 09:00 PM IST',
  });
});
