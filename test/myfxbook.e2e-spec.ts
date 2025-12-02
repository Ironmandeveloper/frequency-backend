import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('MyfxbookController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/myfxbook/test-auth (GET)', () => {
    it('should test authentication using environment variables', () => {
      return request(app.getHttpServer())
        .get('/myfxbook/test-auth')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  describe('/myfxbook/test-auth (POST)', () => {
    it('should test authentication with provided credentials', () => {
      return request(app.getHttpServer())
        .post('/myfxbook/test-auth')
        .send({
          email: 'test@example.com',
          password: 'testpassword',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should return 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/myfxbook/test-auth')
        .send({
          email: 'invalid-email',
          password: 'testpassword',
        })
        .expect(400);
    });

    it('should return 400 for missing required fields', () => {
      return request(app.getHttpServer())
        .post('/myfxbook/test-auth')
        .send({
          email: 'test@example.com',
        })
        .expect(400);
    });
  });

  describe('/myfxbook/login (POST)', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/myfxbook/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('session');
        });
    });

    it('should return 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/myfxbook/login')
        .send({
          email: 'invalid-email',
          password: 'testpassword',
        })
        .expect(400);
    });
  });
});

