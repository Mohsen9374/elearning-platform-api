const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const config = require('./config');
const v1Routes = require('./routes/v1');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));
if (config.env === 'development') app.use(morgan('dev'));

app.use('/uploads', express.static(config.upload.dir));

app.get('/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ success: dbUp, status: dbUp ? 'ok' : 'degraded', db: dbUp });
});

app.use('/api/v1', v1Routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
