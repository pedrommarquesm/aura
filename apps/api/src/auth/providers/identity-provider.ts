export interface VerifiedIdentity {
  /** The provider's stable subject id. The only safe identity key. */
  subject: string;
  /**
   * May be absent, and may be an Apple private-relay address. OAuth identity
   * still keys on `subject`. A non-relay email may attach this provider to an
   * existing password account — see `linkableOauthEmail`.
   */
  email?: string | undefined;
  name?: string | undefined;
}

export interface IdentityProvider {
  readonly name: 'apple' | 'google';
  /** Whether the provider is configured. Sign-in is refused when it is not. */
  readonly enabled: boolean;
  verify(identityToken: string, nonce?: string): Promise<VerifiedIdentity>;
}
