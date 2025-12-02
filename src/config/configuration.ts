export const configuration = () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',
  myfxbook: {
    apiUrl: process.env.MYFXBOOK_API_URL || 'https://www.myfxbook.com/api',
    email: process.env.MYFXBOOK_EMAIL || '',
    password: process.env.MYFXBOOK_PASSWORD || '',
  },
});

