const express = require('express');
require('express-async-errors'); // handles async errors automatically
const morgan = require('morgan');
const cors = require('cors');
const csurf = require('csurf');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { ValidationError } = require('sequelize');

const routes = require('./routes');
const { environment } = require('./config');

const isProduction = environment === 'production';

const app = express();

/** ---------------- Middleware Setup ---------------- **/

// Logging
app.use(morgan('dev'));

// Parse cookies and JSON
app.use(cookieParser());
app.use(express.json());

// Security Headers
app.use(
  helmet.crossOriginResourcePolicy({
    policy: 'cross-origin',
  })
);

// Enable CORS only in development
if (!isProduction) {
  app.use(cors());
}

// CSRF Protection
app.use(
  csurf({
    cookie: {
      secure: isProduction,
      sameSite: isProduction ? 'Lax' : undefined,
      httpOnly: true,
    },
  })
);

/** ---------------- Routes ---------------- **/

app.use(routes);

/** ---------------- Error Handling ---------------- **/

// 404 handler
app.use((_req, _res, next) => {
  const err = new Error("The requested resource couldn't be found.");
  err.title = 'Resource Not Found';
  err.errors = ["The requested resource couldn't be found."];
  err.status = 404;
  next(err);
});

// Sequelize Validation Error handler
app.use((err, _req, _res, next) => {
  if (err instanceof ValidationError) {
    err.errors = err.errors.map(e => e.message);
    err.title = 'Validation Error';
    err.status = 400;
  }
  next(err);
});

// Global error formatter
app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({
    message: err.message || 'Server Error',
    statusCode: err.status || 500,
    errors: err.errors || [],
    stack: isProduction ? undefined : err.stack,
  });
});

module.exports = app;
