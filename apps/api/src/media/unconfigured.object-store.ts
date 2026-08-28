import { AppError } from '../common/errors/app-error';

import type { ObjectMeta, ObjectStore, PresignedUpload } from './object-store';

/** Used when R2 is not configured. Upload routes fail closed with a stable code. */
export class UnconfiguredObjectStore implements ObjectStore {
  readonly provider = 'r2' as const;
  readonly configured = false;
  readonly bucket = '';

  ensureReady(): Promise<void> {
    return this.unavailable();
  }

  presignUpload(): Promise<PresignedUpload> {
    return this.unavailable();
  }

  head(): Promise<ObjectMeta | null> {
    return this.unavailable();
  }

  get(): Promise<Buffer> {
    return this.unavailable();
  }

  put(): Promise<void> {
    return this.unavailable();
  }

  delete(): Promise<void> {
    return this.unavailable();
  }

  copy(): Promise<void> {
    return this.unavailable();
  }

  private unavailable(): Promise<never> {
    return Promise.reject(AppError.unavailable('Media storage is not configured'));
  }
}
