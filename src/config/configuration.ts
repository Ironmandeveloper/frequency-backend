export const configuration = () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',
  myfxbook: {
    apiUrl: process.env.MYFXBOOK_API_URL || 'https://www.myfxbook.com/api',
    email: process.env.MYFXBOOK_EMAIL || '',
    password: process.env.MYFXBOOK_PASSWORD || '',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    ttl: parseInt(process.env.REDIS_TTL || '30', 10), // Default 
    enableCache: process.env.REDIS_ENABLE_CACHE !== 'false', // Default true
  },
});

