import { Inject, Injectable, Logger } from '@nestjs/common';

import { ENV, type Env } from '../config/env';

export const MUX_PROVIDER = 'mux';

export interface MuxCreatedAsset {
  id: string;
  playbackId: string | null;
}

/**
 * Thin Mux Video client. The worker uses this to ingest our public master
 * URL; the API uses the same module only to know whether tokens exist.
 *
 * Playback IDs stay coordinates. URLs are built at read time.
 */
@Injectable()
export class MuxVideoService {
  private readonly logger = new Logger(MuxVideoService.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  get ingestConfigured(): boolean {
    return Boolean(this.env.MUX_TOKEN_ID && this.env.MUX_TOKEN_SECRET);
  }

  get webhookConfigured(): boolean {
    return Boolean(this.env.MUX_WEBHOOK_SECRET);
  }

  async createAsset(input: { sourceUrl: string; passthrough: string }): Promise<MuxCreatedAsset> {
    if (!this.env.MUX_TOKEN_ID || !this.env.MUX_TOKEN_SECRET) {
      throw new Error('Mux is not configured');
    }

    const auth = Buffer.from(`${this.env.MUX_TOKEN_ID}:${this.env.MUX_TOKEN_SECRET}`).toString(
      'base64',
    );

    const response = await fetch('https://api.mux.com/video/v1/assets', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [{ url: input.sourceUrl }],
        playback_policies: ['public'],
        video_quality: 'basic',
        passthrough: input.passthrough,
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      this.logger.error(`Mux create asset failed: ${response.status} ${text.slice(0, 400)}`);
      throw new Error(`Mux create asset failed (${response.status})`);
    }

    const parsed = JSON.parse(text) as {
      data?: {
        id?: string;
        playback_ids?: Array<{ id?: string; policy?: string }>;
      };
    };

    const id = parsed.data?.id;
    if (!id) {
      throw new Error('Mux create asset returned no id');
    }

    const playbackId =
      parsed.data?.playback_ids?.find((item) => item.policy === 'public' && item.id)?.id ??
      parsed.data?.playback_ids?.[0]?.id ??
      null;

    return { id, playbackId };
  }
}
