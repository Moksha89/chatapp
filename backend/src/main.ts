import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PeerServer } from 'peer';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : '*';

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT || 3000;
  const peerPort = process.env.PEER_PORT || 3001;

  await app.listen(port);

  // Start PeerJS on a separate port to avoid WebSocket conflicts with Socket.IO
  const peerServer = PeerServer({
    port: Number(peerPort),
    path: '/peer',
    allow_discovery: true,
  });

  peerServer.on('connection', (client) => {
    console.log(`[PeerJS] Client connected: ${client.getId()}`);
  });

  peerServer.on('disconnect', (client) => {
    console.log(`[PeerJS] Client disconnected: ${client.getId()}`);
  });

  console.log(`Server running on port ${port}`);
  console.log(`PeerJS server running on port ${peerPort}/peer`);
}
bootstrap();
