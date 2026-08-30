import { Global, Module } from '@nestjs/common';

import { ENV, type Env } from '../config/env';

import { MediaUrlResolver } from './media-url.resolver';
import { MuxWebhookController } from './mux-webhook.controller';
import { MuxWebhookService } from './mux-webhook.service';
import { MuxVideoService } from './mux.service';
import { OBJECT_STORE, type ObjectStore } from './object-store';
import { ProcessMediaService } from './process-media.service';
import { isR2Configured, R2ObjectStore } from './r2.object-store';
import { SweepOrphansService } from './sweep-orphans.service';
import { UnconfiguredObjectStore } from './unconfigured.object-store';
import { UploadsService } from './uploads.service';

@Global()
@Module({
  controllers: [MuxWebhookController],
  providers: [
    MediaUrlResolver,
    MuxVideoService,
    MuxWebhookService,
    {
      provide: OBJECT_STORE,
      inject: [ENV],
      useFactory: (env: Env): ObjectStore =>
        isR2Configured(env) ? new R2ObjectStore(env) : new UnconfiguredObjectStore(),
    },
    UploadsService,
    ProcessMediaService,
    SweepOrphansService,
  ],
  exports: [
    MediaUrlResolver,
    OBJECT_STORE,
    UploadsService,
    ProcessMediaService,
    SweepOrphansService,
    MuxVideoService,
    MuxWebhookService,
  ],
})
export class MediaModule {}
