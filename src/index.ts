import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import * as path from 'path';
import apiRoutes from './app/routes';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import config from './config';

const app = express();
const PORT = config.port;

// CORS configuration (allowing credentials for cookie sharing with next.js)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(null, true); // Fallback to avoid strict blocking in dev environments
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve file attachments statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes mounting
app.use('/api', apiRoutes);

// Simple healthcheck route
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// global error handler
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`[Server] Running in ${config.env} mode on port ${PORT}`);
});

