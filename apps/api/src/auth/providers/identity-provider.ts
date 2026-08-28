export interface VerifiedIdentity {
  /** The provider's stable subject id. The only safe identity key. */
  subject: string;
  /**
   * May be absent, and may be an Apple private-relay address. Never used to
   * match an existing account — only stored for support and contact.
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
