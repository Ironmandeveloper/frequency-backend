import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { MyfxbookService } from './myfxbook.service';
import { of, throwError } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('MyfxbookService', () => {
  let service: MyfxbookService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  const mockSession = 'test-session-token-12345';

  beforeEach(async () => {
    const mockHttpService = {
      post: jest.fn(),
      get: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          'myfxbook.apiUrl': 'https://www.myfxbook.com/api',
          'myfxbook.email': 'test@example.com',
          'myfxbook.password': 'testpassword',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyfxbookService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MyfxbookService>(MyfxbookService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockResponse = {
        data: {
          session: mockSession,
        },
      };

      httpService.get.mockReturnValue(of(mockResponse) as any);

      const result = await service.login();

      expect(result).toBe(mockSession);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://www.myfxbook.com/api/login.json',
        {
          params: {
            email: 'test@example.com',
            password: 'testpassword',
          },
        },
      );
    });

    it('should successfully login with provided credentials', async () => {
      const loginDto = {
        email: 'custom@example.com',
        password: 'custompassword',
      };

      const mockResponse = {
        data: {
          session: mockSession,
        },
      };

      httpService.get.mockReturnValue(of(mockResponse) as any);

      const result = await service.login(loginDto);

      expect(result).toBe(mockSession);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://www.myfxbook.com/api/login.json',
        {
          params: loginDto,
        },
      );
    });

    it('should throw error when login fails', async () => {
      const mockResponse = {
        data: {
          error: true,
          message: 'Invalid credentials',
        },
      };

      httpService.get.mockReturnValue(of(mockResponse) as any);

      await expect(service.login()).rejects.toThrow(HttpException);
      await expect(service.login()).rejects.toThrow(
        'Myfxbook authentication failed: Invalid credentials',
      );
    });

    it('should throw error when credentials are missing', async () => {
      configService.get.mockReturnValue('');

      await expect(service.login()).rejects.toThrow(HttpException);
      await expect(service.login()).rejects.toThrow(
        'Myfxbook credentials are required',
      );
    });

    it('should handle HTTP errors', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new Error('Network error')) as any,
      );

      await expect(service.login()).rejects.toThrow(HttpException);
    });
  });

  describe('testAuthentication', () => {
    it('should return success when authentication works', async () => {
      const mockResponse = {
        data: {
          session: mockSession,
        },
      };

      httpService.get.mockReturnValue(of(mockResponse) as any);

      const result = await service.testAuthentication();

      expect(result.success).toBe(true);
      expect(result.session).toBe(mockSession);
      expect(result.message).toBe('Myfxbook authentication successful');
    });

    it('should return failure when authentication fails', async () => {
      const mockResponse = {
        data: {
          error: true,
          message: 'Invalid credentials',
        },
      };

      httpService.get.mockReturnValue(of(mockResponse) as any);

      const result = await service.testAuthentication();

      expect(result.success).toBe(false);
      expect(result.session).toBeUndefined();
      expect(result.message).toContain('Myfxbook authentication failed');
    });
  });

  describe('makeAuthenticatedRequest', () => {
    it('should make authenticated API request', async () => {
      const endpoint = 'get-my-accounts.json';
      const mockResponse = {
        data: {
          error: false,
          data: { accounts: [] },
        },
      };

      httpService.get.mockReturnValue(of(mockResponse) as any);

      const result = await service.makeAuthenticatedRequest(
        endpoint,
        mockSession,
      );

      expect(result).toEqual(mockResponse.data);
      expect(httpService.get).toHaveBeenCalledWith(
        `https://www.myfxbook.com/api/${endpoint}`,
        {
          params: {
            session: mockSession,
          },
        },
      );
    });

    it('should handle request errors', async () => {
      const endpoint = 'get-my-accounts.json';

      httpService.get.mockReturnValue(
        throwError(() => new Error('Network error')) as any,
      );

      await expect(
        service.makeAuthenticatedRequest(endpoint, mockSession),
      ).rejects.toThrow(HttpException);
    });
  });
});

