import { Test, TestingModule } from '@nestjs/testing';
import { MyfxbookController } from './myfxbook.controller';
import { MyfxbookService } from './myfxbook.service';

describe('MyfxbookController', () => {
  let controller: MyfxbookController;
  let service: MyfxbookService;

  const mockMyfxbookService = {
    login: jest.fn(),
    testAuthentication: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MyfxbookController],
      providers: [
        {
          provide: MyfxbookService,
          useValue: mockMyfxbookService,
        },
      ],
    }).compile();

    controller = module.get<MyfxbookController>(MyfxbookController);
    service = module.get<MyfxbookService>(MyfxbookService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return session token on successful login', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const session = 'test-session-token';

      mockMyfxbookService.login.mockResolvedValue(session);

      const result = await controller.login(loginDto);

      expect(result.success).toBe(true);
      expect(result.data?.session).toBe(session);
      expect(result.message).toBe('Login successful');
      expect(service.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('testAuthentication', () => {
    it('should return success when authentication works', async () => {
      const testResult = {
        success: true,
        session: 'test-session',
        message: 'Myfxbook authentication successful',
      };

      mockMyfxbookService.testAuthentication.mockResolvedValue(testResult);

      const result = await controller.testAuthentication();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testResult);
      expect(result.message).toBe('Authentication test passed');
    });

    it('should return failure when authentication fails', async () => {
      const testResult = {
        success: false,
        message: 'Authentication failed',
      };

      mockMyfxbookService.testAuthentication.mockResolvedValue(testResult);

      const result = await controller.testAuthentication();

      expect(result.success).toBe(false);
      expect(result.data).toEqual(testResult);
      expect(result.message).toBe('Authentication test failed');
    });
  });

  describe('testAuthenticationWithCredentials', () => {
    it('should test authentication with provided credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const testResult = {
        success: true,
        session: 'test-session',
        message: 'Myfxbook authentication successful',
      };

      mockMyfxbookService.testAuthentication.mockResolvedValue(testResult);

      const result = await controller.testAuthenticationWithCredentials(loginDto);

      expect(result.success).toBe(true);
      expect(service.testAuthentication).toHaveBeenCalledWith(loginDto);
    });
  });
});

