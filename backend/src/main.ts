import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ExpressPeerServer } from 'peer';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const server = app.getHttpServer();
  const port = process.env.PORT || 3000;

  await app.listen(port);

  // Start PeerJS server on the same HTTP server at /peer path
  const peerServer = ExpressPeerServer(server, {
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

  console.log(`Server running on port ${port}`);
  console.log(`PeerJS server running at /peer`);
}
bootstrap();
