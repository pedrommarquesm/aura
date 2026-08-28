import * as Crypto from 'expo-crypto';

/** Cryptographically random hex string, used as an OIDC nonce. */
export async function createNonce(bytes = 32): Promise<string> {
  const buffer = await Crypto.getRandomBytesAsync(bytes);
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}
