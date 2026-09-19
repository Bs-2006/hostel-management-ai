import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const config = new DocumentBuilder()
    .setTitle('Hostel Management API')
    .setDescription('API documentation for Hostel Management System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = Number(process.env.PORT ?? 3000);
  try {
    await app.listen(port);
  } catch (err: any) {
    if (err?.code === 'EADDRINUSE') {
      console.error(
        `[Bootstrap] Port ${port} already in use (EADDRINUSE). ` +
          `Kill the existing process: npx --yes kill-port ${port}  or  taskkill /PID <pid> /F  (Windows) / lsof -ti:${port} | xargs kill (macOS/Linux), then restart.`,
      );
      process.exit(1);
    }
    throw err;
  }
}
bootstrap().catch((err) => {
  console.error('[Bootstrap] Failed to start:', err);
  process.exit(1);
});
