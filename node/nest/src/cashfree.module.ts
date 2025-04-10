import { Module } from '@nestjs/common';
import { CashfreeService } from './cashfree.service';
import { CashfreeController } from './cashfree.controller';

@Module({
  imports: [],
  controllers: [CashfreeController],
  providers: [CashfreeService],
})
export class CashfreeModule {}