import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ExpressPeerServer } from 'peer';

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

  // Mount PeerJS as Express middleware on the same port (avoids Cloudflare WS issues)
  const httpServer = app.getHttpServer();
  const peerServer = ExpressPeerServer(httpServer, {
    path: '/',
    allow_discovery: true,
  });
  app.use('/peer', peerServer);

  peerServer.on('connection', (client) => {
    console.log(`[PeerJS] Client connected: ${client.getId()}`);
  });

  peerServer.on('disconnect', (client) => {
    console.log(`[PeerJS] Client disconnected: ${client.getId()}`);
  });

  await app.listen(port);

  console.log(`Server running on port ${port}`);
  console.log(`PeerJS mounted at /peer/peerjs on port ${port}`);
}
bootstrap();
