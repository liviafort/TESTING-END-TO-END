import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Socket, io } from 'socket.io-client';
import { Server } from 'http';
import { CreateHistoryDto } from '../history/dto/create-history.dto';
import { AlarmGateway } from './alarm.gateway';

describe('AlarmGateway', () => {
  let app: INestApplication;
  let socket: Socket;
  let server: Server;
  let alarmGateway: AlarmGateway;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [AlarmGateway],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(3001);
    server = app.getHttpServer();
    alarmGateway = moduleFixture.get<AlarmGateway>(AlarmGateway);
  });

  beforeEach((done) => {
    const timeout = setTimeout(() => {
      clearTimeout(timeout);
      done(new Error('Socket connection timeout'));
    }, 5000);

    socket = require('socket.io-client')(`http://localhost:3001`, {
      transports: ['websocket']
    });

    socket.on('connect', () => {
      clearTimeout(timeout);
      done();
    });
  });

  afterEach((done) => {
    if (socket.connected) {
      socket.disconnect();
    }
    done();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Socket Alarm Test', () => {
    it('should handle esp create', (done) => {
      const testEsp = {
        id: 1,
        updateAt: '2023-12-12T18:15:05.012Z',
        register: 'HMACE-001',
        temperature: 3,
        typeEsp: 'GPS',
      };

      const simplifiedResult = {
        name: 'HEMOCENTRO REGIONAL',
        city: 'IGUATU',
        state: 'CEARÁ',
        esps: [testEsp],
      };

      jest.spyOn(alarmGateway, 'handleEspCreate').mockImplementation((payload) => {
        const parsedPayload = JSON.parse(payload.message);
        
        expect(parsedPayload.name).toBe(simplifiedResult.name);
        expect(parsedPayload.city).toBe(simplifiedResult.city);
        expect(parsedPayload.state).toBe(simplifiedResult.state);
        expect(parsedPayload.esps).toHaveLength(1);
        expect(parsedPayload.esps[0]).toEqual(testEsp);
        
        done();
      });

      alarmGateway.handleEspCreate({ message: JSON.stringify(simplifiedResult) });
    });

    it('should handle temperature alarm', (done) => {

      const testCreatedHistory = {
        id: 1,
        createdAt: '2023-12-12T18:15:05.012Z',
        updateAt: '2023-12-12T18:15:05.012Z',
        register: 'HMACE-001',
        temperature: 3,
        lat: 25,
        lon: 40,
        esp_id: 1,
      };

      jest.spyOn(alarmGateway, 'handleTemperatureHistory').mockImplementation((payload) => {
        const parsedPayload = JSON.parse(payload.message);

        console.log(parsedPayload)

        expect(parsedPayload.aviso).toBe('TEMPERATURA ULTRAPASSOU A FAIXA LIMITE');
        expect(parsedPayload.esp).toEqual(testCreatedHistory);

        done();
      });

      alarmGateway.handleTemperatureHistory({
        message: JSON.stringify({
          aviso: 'TEMPERATURA ULTRAPASSOU A FAIXA LIMITE',
          esp: testCreatedHistory,
        }),
      });
    });
  });
});
