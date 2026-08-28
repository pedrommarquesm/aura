import { Global, Module } from '@nestjs/common';

import { AuraLedgerService } from './aura-ledger.service';

@Global()
@Module({
  providers: [AuraLedgerService],
  exports: [AuraLedgerService],
})
export class AuraModule {}
