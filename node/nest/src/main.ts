import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as express from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  app.use(express.static(path.join(__dirname, '..')));
  app.enableCors();
  const port = process.env.PORT || 3000; // Default to port 3000 if undefined
  await app.listen(port);
}
bootstrap();