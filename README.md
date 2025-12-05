# Frequency Backend

A NestJS backend application with Myfxbook API integration.

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Myfxbook account credentials

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd frequency-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` file with your configuration:
```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

MYFXBOOK_API_URL=https://www.myfxbook.com/api
MYFXBOOK_EMAIL=your-email@example.com
MYFXBOOK_PASSWORD=your-password
```

5. Start the development server:
```bash
npm run start:dev
```

The application will be available at `http://localhost:3000/api`

6. Access Swagger documentation:
```
http://localhost:3000/api/docs
```

## 📁 Project Structure

```
frequency-backend/
├── src/
│   ├── common/              # Shared utilities and common code
│   │   ├── dto/            # Base DTOs
│   │   └── filters/        # Exception filters
│   ├── config/             # Configuration module
│   │   ├── config.module.ts
│   │   └── configuration.ts
│   ├── myfxbook/           # Myfxbook integration module
│   │   ├── dto/            # Data Transfer Objects
│   │   ├── myfxbook.controller.ts
│   │   ├── myfxbook.service.ts
│   │   ├── myfxbook.module.ts
│   │   └── *.spec.ts       # Unit tests
│   ├── app.module.ts       # Root module
│   └── main.ts             # Application entry point
├── test/                    # E2E tests
├── dist/                    # Compiled output
├── .env.example             # Environment variables template
├── .prettierrc              # Prettier configuration
├── eslint.config.mjs        # ESLint configuration
├── tsconfig.json            # TypeScript configuration
└── package.json
```

## 📚 API Documentation

Swagger documentation is available at:
```
http://localhost:3000/api/docs
```

The Swagger UI provides:
- Interactive API testing
- Request/response schemas
- Authentication examples
- Error response documentation

## 🧪 Testing Myfxbook Authentication

### Test Authentication (Using Environment Variables)

The `GET /api/myfxbook/test-auth` endpoint automatically uses credentials from your `.env` file:

```bash
# GET request - uses credentials from .env file
curl http://localhost:3000/api/myfxbook/test-auth
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Authentication test passed",
  "data": {
    "success": true,
    "session": "abc123xyz789",
    "message": "Myfxbook authentication successful"
  }
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "Authentication test failed",
  "data": {
    "success": false,
    "message": "Myfxbook authentication failed: Invalid credentials"
  }
}
```

### Test Authentication (With Custom Credentials)

```bash
# POST request - uses provided credentials
curl -X POST http://localhost:3000/api/myfxbook/test-auth \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

### Login Endpoint

```bash
curl -X POST http://localhost:3000/api/myfxbook/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "success": true,
    "session": "DSL07vu14QxHWErTIAFrH40",
    "message": "Myfxbook authentication successful"
  }
}
```

### Logout Endpoint

Invalidate your session token and logout from Myfxbook API:

```bash
curl -X POST http://localhost:3000/api/myfxbook/logout \
  -H "Content-Type: application/json" \
  -d '{
    "session": "DSL07vu14QxHWErTIAFrH40"
  }'
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Logout successful",
  "data": {
    "error": false,
    "message": "Session successfully closed"
  }
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "Logout failed",
  "data": {
    "error": true,
    "message": "Failed to logout: Invalid session."
  }
}
```

### Get My Accounts

Retrieve all trading accounts associated with your session:

```bash
# GET request with session token
curl "http://localhost:3000/api/myfxbook/get-my-accounts?session=YOUR_SESSION_TOKEN"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Accounts retrieved successfully",
  "data": {
    "error": false,
    "accounts": [
      {
        "id": 12345,
        "name": "My Trading Account",
        "broker": "OANDA",
        "currency": "USD",
        "balance": 10000.00,
        "equity": 10500.00,
        "gain": 25.50,
        "profit": 2550.00,
        "drawdown": 5.2,
        "totalTrades": 150,
        "creationDate": "2024-01-01",
        "lastUpdateDate": "2024-12-01",
        "isActive": true
      }
    ]
  }
}
```

### Get Trade History

Retrieve complete trade history for a specific account:

```bash
# GET request with session token and account ID
curl "http://localhost:3000/api/myfxbook/get-history?session=YOUR_SESSION_TOKEN&id=12345"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Trade history retrieved successfully",
  "data": {
    "error": false,
    "history": [
      {
        "id": 123456789,
        "orderId": 987654321,
        "action": "buy",
        "symbol": "EURUSD",
        "lots": 0.1,
        "openPrice": 1.1850,
        "closePrice": 1.1900,
        "openTime": "2024-01-01 10:00:00",
        "closeTime": "2024-01-01 15:00:00",
        "profit": 50.00,
        "pips": 50,
        "comment": "Trade comment",
        "commission": 0.50,
        "swap": -0.25,
        "sl": 1.1800,
        "tp": 1.1950,
        "magic": 12345
      }
    ],
    "pageNumber": 1,
    "totalPages": 10
  }
}
```

### Get Gain Data

Retrieve gain/performance data for a specific account:

```bash
# GET request with query parameters
curl "http://localhost:3000/api/myfxbook/get-gain?session=YOUR_SESSION_TOKEN&id=12345&start=2024-01-01&end=2024-12-31"

# POST request with body parameters
curl -X POST http://localhost:3000/api/myfxbook/get-gain \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_TOKEN",
    "id": "12345",
    "start": "2024-01-01",
    "end": "2024-12-31"
  }'
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Gain data retrieved successfully",
  "data": {
    "error": false,
    "data": [
      {
        "date": "2024-01-01",
        "gain": 5.25,
        "balance": 10525.50
      },
      {
        "date": "2024-01-02",
        "gain": 5.80,
        "balance": 10580.00
      }
    ],
    "totalGain": 25.50
  }
}
```

### Get Daily Gain Data

Retrieve daily gain/performance data for a specific account:

```bash
# GET request with query parameters
curl "http://localhost:3000/api/myfxbook/get-daily-gain?session=YOUR_SESSION_TOKEN&id=12345&start=2000-01-01&end=2010-01-01"
```

**Parameters:**
- `session` (required): Session token obtained from the login endpoint
- `id` (required): Account ID from Myfxbook
- `start` (required): Start date in format YYYY-MM-DD
- `end` (required): End date in format YYYY-MM-DD

**Response (Success):**
```json
{
  "success": true,
  "message": "Daily gain data retrieved successfully",
  "data": {
    "error": false,
    "data": [
      {
        "date": "2000-01-01",
        "gain": 0.0,
        "balance": 10000.00
      },
      {
        "date": "2000-01-02",
        "gain": 1.25,
        "balance": 10125.00
      },
      {
        "date": "2000-01-03",
        "gain": 1.50,
        "balance": 10150.00
      }
    ]
  }
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "Failed to fetch daily gain data",
  "data": {
    "error": true,
    "message": "Failed to fetch daily gain data: Invalid session."
  }
}
```

## 🧪 Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## 📝 Available Scripts

- `npm run build` - Build the application
- `npm run start` - Start the application
- `npm run start:dev` - Start in development mode with hot reload
- `npm run start:debug` - Start in debug mode
- `npm run start:prod` - Start in production mode
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run E2E tests
- `npm run test:cov` - Run tests with coverage

## 🏗️ Development Guidelines

### Code Style

- Follow NestJS best practices and conventions
- Use TypeScript strict mode
- Write unit tests for all services
- Write E2E tests for all controllers
- Use DTOs for data validation
- Follow the existing folder structure

### Commit Messages

Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Build process or auxiliary tool changes

### API Endpoints

All API endpoints are prefixed with `/api`

#### Myfxbook Endpoints

- `GET /api/myfxbook/test-auth` - Test authentication using env variables
- `POST /api/myfxbook/login` - Login and get session token
- `POST /api/myfxbook/logout` - Logout and invalidate session token
- `GET /api/myfxbook/get-my-accounts` - Get user's trading accounts
- `GET /api/myfxbook/get-history` - Get trade history for an account
- `GET /api/myfxbook/get-gain` - Get gain data with query parameters
- `GET /api/myfxbook/get-daily-gain` - Get daily gain data for a specific date range

## 🔒 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `CORS_ORIGIN` | CORS allowed origin | `*` |
| `MYFXBOOK_API_URL` | Myfxbook API base URL | `https://www.myfxbook.com/api` |
| `MYFXBOOK_EMAIL` | Myfxbook account email | - |
| `MYFXBOOK_PASSWORD` | Myfxbook account password | - |

## 📚 Technologies Used

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript
- [Swagger/OpenAPI](https://swagger.io/) - API documentation
- [Axios](https://axios-http.com/) - HTTP client
- [class-validator](https://github.com/typestack/class-validator) - Validation
- [Jest](https://jestjs.io/) - Testing framework

## 🎯 Milestone 1 Status

✅ Repository initialized
✅ Project structure created
✅ Myfxbook authentication module implemented
✅ Unit tests created
✅ E2E tests created
✅ Development environment configured
✅ Documentation completed

## 📖 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Myfxbook API Documentation](https://www.myfxbook.com/api)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is private and proprietary.
