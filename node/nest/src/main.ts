// Import required modules and dependencies
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as dotenv from "dotenv";
import * as path from "path";
import * as express from "express";
import { NestExpressApplication } from "@nestjs/platform-express";

// Load environment variables from the .env file
dotenv.config();

async function bootstrap() {
  // Create a NestJS application instance
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static files from the parent directory
  app.use(express.static(path.join(__dirname, "..")));

  // Enable Cross-Origin Resource Sharing (CORS)
  app.enableCors();

  // Define the port to listen on, defaulting to 3000 if not specified
  const port = process.env.PORT || 3000;

  // Start the application and listen on the specified port
  await app.listen(port);
}

// Initialize the application
bootstrap();
