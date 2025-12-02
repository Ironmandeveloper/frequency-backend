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
- `POST /api/myfxbook/test-auth` - Test authentication with provided credentials
- `POST /api/myfxbook/login` - Login and get session token

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
