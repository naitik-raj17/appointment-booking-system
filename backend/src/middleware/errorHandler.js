const { ZodError } = require('zod');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function notFound(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  let status = 500;
  let body = { message: 'Something went wrong. Please try again.', code: 'INTERNAL_ERROR' };

  if (err instanceof ApiError) {
    status = err.statusCode;
    body = { message: err.message, code: err.code, details: err.details };
  } else if (err instanceof ZodError) {
    status = 400;
    const details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    body = { message: details[0] ? `${details[0].field || 'input'}: ${details[0].message}` : 'Invalid input', code: 'VALIDATION_ERROR', details };
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    body = { message: details[0]?.message || 'Invalid input', code: 'VALIDATION_ERROR', details };
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    body = { message: `Invalid value for ${err.path}`, code: 'INVALID_ID' };
  } else if (err && err.code === 11000) {
    status = 409;
    body = { message: 'A record with these details already exists', code: 'DUPLICATE' };
  } else if (err && err.type === 'entity.parse.failed') {
    status = 400;
    body = { message: 'Malformed JSON body', code: 'BAD_JSON' };
  }

  if (status >= 500 && !env.isTest) console.error(err);
  res.status(status).json({ error: body });
}

module.exports = { notFound, errorHandler };
