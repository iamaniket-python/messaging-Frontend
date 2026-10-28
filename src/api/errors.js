export class ApiError extends Error {
  constructor({
    status = 0,
    code = 'UNKNOWN_ERROR',
    message = 'Something went wrong',
    details,
    requestId,
  } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

const FRIENDLY = {
  NETWORK_ERROR: 'Cannot reach the server. Check your connection and try again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  STORAGE_NOT_CONFIGURED: 'File storage is not configured on the server yet.',
  TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
  INVALID_TOKEN: 'Your session is invalid. Please sign in again.',
  MISSING_TOKEN: 'Please sign in to continue.',
};

function formatDetail(d) {
  const path = Array.isArray(d?.path) ? d.path.join('.') : d?.path;
  const msg = d?.message || 'Invalid value';
  return path ? `${path}: ${msg}` : msg;
}

export function describeError(err) {
  if (!(err instanceof ApiError)) {
    return { message: 'Something went wrong. Please try again.', details: [] };
  }
  const details = Array.isArray(err.details) ? err.details.map(formatDetail) : [];
  if (err.code === 'VALIDATION_ERROR') {
    return { message: 'Please fix the following:', details };
  }
  return {
    message: FRIENDLY[err.code] || err.message || 'Something went wrong.',
    details,
  };
}
