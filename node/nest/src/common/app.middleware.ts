import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const startTime = Date.now();

    console.log(`Request: ${method} ${originalUrl}`);

    res.on('finish', () => {
      const { statusCode } = res;
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Response: ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
    });

    next();
  }
}