import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Book Rental API')
    .setDescription('ระบบเช่าหนังสือ API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // http://localhost:3000/api-docs
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.use(
    helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();