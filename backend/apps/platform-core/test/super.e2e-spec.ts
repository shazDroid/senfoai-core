import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

describe('Super User Module (E2E)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        process.env.DATABASE_URL = "postgresql://senfo:supersecurepassword@localhost:5432/senfo_platform";
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('POST /super/namespace should fail without auth', () => {
        return request(app.getHttpServer())
            .post('/super/namespace')
            .send({ name: 'Test Corp' })
            .expect(403); // Forbidden
    });

    // NOTE: To test positive case, we need to mock Auth or have a valid JWT with SUPER_USER role.
    // For this verification step, ensuring the endpoint is PROTECTED (403) is excellent proof 
    // that the new module is wired up and the Guard is working.
});
