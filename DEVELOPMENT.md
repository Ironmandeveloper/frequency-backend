# Development Guide

This document outlines the development rules and best practices for the Frequency Backend project.

## 📋 Table of Contents

- [Folder Structure](#folder-structure)
- [Coding Standards](#coding-standards)
- [Naming Conventions](#naming-conventions)
- [Testing Guidelines](#testing-guidelines)
- [Git Workflow](#git-workflow)
- [Code Review Checklist](#code-review-checklist)

## 📁 Folder Structure

### Standard NestJS Structure

```
src/
├── common/              # Shared code across modules
│   ├── dto/            # Base DTOs and interfaces
│   ├── filters/        # Exception filters
│   ├── guards/         # Authentication/Authorization guards
│   ├── interceptors/   # Request/Response interceptors
│   └── pipes/          # Custom pipes
├── config/             # Configuration modules
├── [module-name]/      # Feature modules
│   ├── dto/            # Module-specific DTOs
│   ├── entities/       # Database entities (if applicable)
│   ├── [module].controller.ts
│   ├── [module].service.ts
│   ├── [module].module.ts
│   └── *.spec.ts       # Unit tests
├── app.module.ts       # Root module
└── main.ts             # Application entry point
```

### Rules

1. **One module per feature** - Each feature should have its own module
2. **Shared code in common/** - Reusable code goes in the common folder
3. **DTOs in dto/** - All data transfer objects should be in a dto subfolder
4. **Tests alongside code** - Unit tests should be in the same directory as the code

## 💻 Coding Standards

### TypeScript

- Use **strict mode** - Enable all TypeScript strict checks
- **No `any` types** - Use proper types or `unknown` when necessary
- **Explicit return types** - Always specify return types for functions
- **Use interfaces for objects** - Prefer interfaces over type aliases for object shapes
- **Use enums for constants** - Use enums for fixed sets of values

### NestJS Best Practices

1. **Dependency Injection** - Always use constructor injection
2. **Decorators** - Use appropriate decorators (@Injectable, @Controller, etc.)
3. **Modules** - Keep modules focused and cohesive
4. **Services** - Business logic goes in services, not controllers
5. **DTOs** - Use DTOs for all request/response validation

### Code Organization

```typescript
// ✅ Good: Properly organized service
@Injectable()
export class MyfxbookService {
  private readonly logger = new Logger(MyfxbookService.name);
  
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async login(loginDto: LoginDto): Promise<string> {
    // Implementation
  }
}

// ❌ Bad: Missing logger, no proper DI
export class MyfxbookService {
  async login(email: string, password: string) {
    // Implementation
  }
}
```

## 🏷️ Naming Conventions

### Files

- **Controllers**: `[name].controller.ts`
- **Services**: `[name].service.ts`
- **Modules**: `[name].module.ts`
- **DTOs**: `[name].dto.ts`
- **Tests**: `[name].spec.ts` (unit), `[name].e2e-spec.ts` (e2e)
- **Entities**: `[name].entity.ts`

### Classes

- **PascalCase** for all classes, interfaces, enums
- **Descriptive names** - Avoid abbreviations
- **Suffix conventions**:
  - Controllers: `[Name]Controller`
  - Services: `[Name]Service`
  - DTOs: `[Name]Dto`
  - Modules: `[Name]Module`

### Variables and Functions

- **camelCase** for variables and functions
- **Descriptive names** - `getUserById` not `getUser`
- **Boolean prefixes**: `is`, `has`, `should`, `can`
- **Constants**: `UPPER_SNAKE_CASE`

### Examples

```typescript
// ✅ Good
class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly MAX_RETRY_ATTEMPTS = 3;
  
  async getUserById(userId: string): Promise<User> {
    // Implementation
  }
  
  isUserActive(user: User): boolean {
    return user.status === UserStatus.ACTIVE;
  }
}

// ❌ Bad
class userSvc {
  async get(u: string) {
    // Implementation
  }
}
```

## 🧪 Testing Guidelines

### Unit Tests

- **One test file per source file** - `*.spec.ts` alongside source
- **Test all public methods** - Cover all service methods
- **Mock dependencies** - Use Jest mocks for external dependencies
- **Arrange-Act-Assert** - Follow AAA pattern
- **Descriptive test names** - `should return user when valid id is provided`

### E2E Tests

- **One file per feature** - `[feature].e2e-spec.ts` in test folder
- **Test complete flows** - Test entire request/response cycles
- **Use test database** - Never use production data
- **Clean up after tests** - Reset state between tests

### Test Coverage

- **Minimum 80% coverage** - Aim for high coverage
- **Critical paths 100%** - Authentication, payments, etc.
- **Run before commit** - Ensure all tests pass

### Example

```typescript
// ✅ Good: Comprehensive unit test
describe('MyfxbookService', () => {
  let service: MyfxbookService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MyfxbookService,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();
    
    service = module.get<MyfxbookService>(MyfxbookService);
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const loginDto = { email: 'test@example.com', password: 'pass' };
      httpService.post.mockResolvedValue({ data: { session: 'token' } });

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toBe('token');
      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        loginDto,
      );
    });
  });
});
```

## 🔀 Git Workflow

### Branch Naming

- `feature/[feature-name]` - New features
- `fix/[bug-description]` - Bug fixes
- `refactor/[what]` - Code refactoring
- `docs/[what]` - Documentation
- `test/[what]` - Test additions/changes

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Build/tooling

**Examples:**
```
feat(myfxbook): add authentication endpoint
fix(auth): resolve session token expiration issue
docs(readme): update installation instructions
```

### Pull Request Process

1. **Create feature branch** from `main`
2. **Make changes** following coding standards
3. **Write/update tests** - Ensure coverage
4. **Run linter** - `npm run lint`
5. **Run tests** - `npm run test && npm run test:e2e`
6. **Create PR** - Include description and checklist
7. **Code review** - Address feedback
8. **Merge** - Squash and merge

## ✅ Code Review Checklist

### Functionality

- [ ] Code works as intended
- [ ] Edge cases handled
- [ ] Error handling implemented
- [ ] No console.logs or debug code

### Code Quality

- [ ] Follows naming conventions
- [ ] No code duplication
- [ ] Proper error messages
- [ ] Comments for complex logic

### Testing

- [ ] Unit tests written
- [ ] E2E tests written (if applicable)
- [ ] All tests passing
- [ ] Coverage maintained

### Documentation

- [ ] README updated (if needed)
- [ ] Code comments added
- [ ] API documentation updated

### Security

- [ ] No sensitive data in code
- [ ] Input validation implemented
- [ ] Authentication/Authorization checked
- [ ] SQL injection prevention (if applicable)

## 🛠️ Development Tools

### Required Extensions (VS Code)

- ESLint
- Prettier
- TypeScript and JavaScript Language Features

### Pre-commit Hooks (Recommended)

Consider using `husky` and `lint-staged`:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write"]
  }
}
```

## 📊 Performance Guidelines

1. **Database queries** - Use indexes, avoid N+1 queries
2. **Caching** - Cache frequently accessed data
3. **Async operations** - Use async/await properly
4. **Error handling** - Don't block the event loop
5. **Memory leaks** - Clean up subscriptions and listeners

## 🔐 Security Best Practices

1. **Environment variables** - Never commit secrets
2. **Input validation** - Validate all user inputs
3. **SQL injection** - Use parameterized queries
4. **XSS prevention** - Sanitize user inputs
5. **Rate limiting** - Implement for public endpoints
6. **HTTPS** - Always use in production

## 📝 Additional Notes

- **Code reviews are mandatory** - No direct commits to main
- **Keep PRs small** - Easier to review and test
- **Document complex logic** - Future you will thank you
- **Refactor regularly** - Don't let technical debt accumulate

---

**Remember**: Code is read more often than it's written. Write code that your future self (and teammates) will understand and appreciate.


