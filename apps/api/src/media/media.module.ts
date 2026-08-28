import { Global, Module } from '@nestjs/common';

import { MediaUrlResolver } from './media-url.resolver';

@Global()
@Module({
  providers: [MediaUrlResolver],
  exports: [MediaUrlResolver],
})
export class MediaModule {}
