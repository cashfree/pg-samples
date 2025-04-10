import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CashfreeModule } from './cashfree.module';
import { LoggerMiddleware } from './common/app.middleware';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [CashfreeModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
      consumer.apply(LoggerMiddleware).forRoutes('*');
  }

}