const ITERATIONS = 600_000;
const toHex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const fromHex = value => Uint8Array.from(value.match(/.{2}/g), byte => parseInt(byte, 16));

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return toHex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)));
}

export async function createCredential(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: toHex(salt), iterations: ITERATIONS, hash: await derive(password, salt, ITERATIONS) };
}

export async function verifyCredential(password, credential) {
  if (!credential || credential.iterations !== ITERATIONS || !/^[a-f0-9]{32}$/.test(credential.salt)) return false;
  const actual = await derive(password, fromHex(credential.salt), credential.iterations);
  if (actual.length !== credential.hash.length) return false;
  let different = 0;
  for (let i = 0; i < actual.length; i++) different |= actual.charCodeAt(i) ^ credential.hash.charCodeAt(i);
  return different === 0;
}
