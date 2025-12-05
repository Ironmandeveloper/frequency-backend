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

  describe('getGain', () => {
    it('should fetch gain data successfully', async () => {
      const accountId = '12345';
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      const mockResponse = {
        data: {
          error: false,
          data: [
            { date: '2024-01-01', gain: 5.25, balance: 10525.50 },
            { date: '2024-01-02', gain: 5.80, balance: 10580.00 },
          ],
          totalGain: 25.50,
        },
      };

      httpService.get.mockReturnValue(of(mockResponse) as any);

      const result = await service.getGain(
        mockSession,
        accountId,
        startDate,
        endDate,
      );

      expect(result).toEqual(mockResponse.data);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://www.myfxbook.com/api/get-gain.json',
        {
          params: {
            session: mockSession,
            id: accountId,
            start: startDate,
            end: endDate,
          },
        },
      );
    });

    it('should throw error when session is missing', async () => {
      await expect(
        service.getGain('', '12345', '2024-01-01', '2024-12-31'),
      ).rejects.toThrow(HttpException);
      await expect(
        service.getGain('', '12345', '2024-01-01', '2024-12-31'),
      ).rejects.toThrow('Session token is required');
    });

    it('should throw error when account ID is missing', async () => {
      await expect(
        service.getGain(mockSession, '', '2024-01-01', '2024-12-31'),
      ).rejects.toThrow(HttpException);
      await expect(
        service.getGain(mockSession, '', '2024-01-01', '2024-12-31'),
      ).rejects.toThrow('Account ID is required');
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        data: {
          error: true,
          message: 'Invalid account ID',
        },
      };

      httpService.get.mockReturnValue(of(mockResponse) as any);

      await expect(
        service.getGain(mockSession, '12345', '2024-01-01', '2024-12-31'),
      ).rejects.toThrow(HttpException);
    });

    it('should handle network errors', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new Error('Network error')) as any,
      );

      await expect(
        service.getGain(mockSession, '12345', '2024-01-01', '2024-12-31'),
      ).rejects.toThrow(HttpException);
    });

    it('should work without optional date parameters', async () => {
      const accountId = '12345';
      const mockResponse = {
        data: {
          error: false,
          data: [],
          totalGain: 0,
        },
      };

      httpService.get.mockReturnValue(of(mockResponse) as any);

      const result = await service.getGain(
        mockSession,
        accountId,
        undefined,
        undefined,
      );

      expect(result).toEqual(mockResponse.data);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://www.myfxbook.com/api/get-gain.json',
        {
          params: {
            session: mockSession,
            id: accountId,
          },
        },
      );
    });
  });

  describe('getMyAccounts', () => {
    it('should fetch user accounts successfully', async () => {
      const mockResponse = {
        data: {
          error: false,
          accounts: [
            {
              id: 12345,
              name: 'My Trading Account',
              broker: 'OANDA',
              currency: 'USD',
              balance: 10000.00,
              equity: 10500.00,
              gain: 25.50,
            },
            {
              id: 67890,
              name: 'Second Account',
              broker: 'IC Markets',
              currency: 'EUR',
              balance: 5000.00,
              equity: 5250.00,
              gain: 15.30,
            },
          ],
        },
      };

      httpService.get.mockReturnValue(of(mockResponse) as any);

      const result = await service.getMyAccounts(mockSession);

      expect(result).toEqual(mockResponse.data);
      expect(result.accounts).toHaveLength(2);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://www.myfxbook.com/api/get-my-accounts.json',
        {
          params: {
            session: mockSession,
          },
        },
      );
    });

    it('should throw error when session is missing', async () => {
      await expect(service.getMyAccounts('')).rejects.toThrow(HttpException);
      await expect(service.getMyAccounts('')).rejects.toThrow(
        'Session token is required',
      );
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        data: {
          error: true,
          message: 'Invalid session token',
        },
      };

      httpService.get.mockReturnValue(of(mockResponse) as any);

      await expect(service.getMyAccounts(mockSession)).rejects.toThrow(
        HttpException,
      );
      await expect(service.getMyAccounts(mockSession)).rejects.toThrow(
        'Failed to fetch accounts: Invalid session token',
      );
    });

    it('should handle network errors', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new Error('Network error')) as any,
      );

      await expect(service.getMyAccounts(mockSession)).rejects.toThrow(
        HttpException,
      );
    });

    it('should handle empty accounts list', async () => {
      const mockResponse = {
        data: {
          error: false,
          accounts: [],
        },
      };

      httpService.get.mockReturnValue(of(mockResponse) as any);

      const result = await service.getMyAccounts(mockSession);

      expect(result).toEqual(mockResponse.data);
      expect(result.accounts).toHaveLength(0);
    });
  });

  describe('getHistory', () => {
    it('should fetch trade history successfully', async () => {
      const accountId = '12345';
      const mockResponse = {
        data: {
          error: false,
          history: [
            {
              id: 123456789,
              orderId: 987654321,
              action: 'buy',
              symbol: 'EURUSD',
              lots: 0.1,
              openPrice: 1.1850,
              closePrice: 1.1900,
              profit: 50.00,
              pips: 50,
            },
            {
              id: 223456789,
              orderId: 887654321,
              action: 'sell',
              symbol: 'GBPUSD',
              lots: 0.2,
              openPrice: 1.2850,
              closePrice: 1.2800,
              profit: 100.00,
              pips: 50,
            },
          ],
          pageNumber: 1,
          totalPages: 5,
        },
      };

      httpService.get.mockReturnValue(of(mockResponse) as any);

      const result = await service.getHistory(mockSession, accountId);

      expect(result).toEqual(mockResponse.data);
      expect(result.history).toHaveLength(2);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://www.myfxbook.com/api/get-history.json',
        {
          params: {
            session: mockSession,
            id: accountId,
          },
        },
      );
    });

    it('should throw error when session is missing', async () => {
      await expect(service.getHistory('', '12345')).rejects.toThrow(
        HttpException,
      );
      await expect(service.getHistory('', '12345')).rejects.toThrow(
        'Session token is required',
      );
    });

    it('should throw error when account ID is missing', async () => {
      await expect(service.getHistory(mockSession, '')).rejects.toThrow(
        HttpException,
      );
      await expect(service.getHistory(mockSession, '')).rejects.toThrow(
        'Account ID is required',
      );
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        data: {
          error: true,
          message: 'Invalid account ID',
        },
      };

      httpService.get.mockReturnValue(of(mockResponse) as any);

      await expect(service.getHistory(mockSession, '12345')).rejects.toThrow(
        HttpException,
      );
      await expect(service.getHistory(mockSession, '12345')).rejects.toThrow(
        'Failed to fetch history: Invalid account ID',
      );
    });

    it('should handle network errors', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new Error('Network error')) as any,
      );

      await expect(service.getHistory(mockSession, '12345')).rejects.toThrow(
        HttpException,
      );
    });

    it('should handle empty history', async () => {
      const mockResponse = {
        data: {
          error: false,
          history: [],
          pageNumber: 1,
          totalPages: 1,
        },
      };

      httpService.get.mockReturnValue(of(mockResponse) as any);

      const result = await service.getHistory(mockSession, '12345');

      expect(result).toEqual(mockResponse.data);
      expect(result.history).toHaveLength(0);
    });
  });
});

