// Detecta tentativa de trocar contato pelo chat antes da confirmação.
// Serve para AVISAR, não para bloquear: bloqueio irrita e é fácil de contornar.
const CONTACT_PATTERNS = [
  /(?:\d[\s.\-()]*){8,}/, // 8+ dígitos, mesmo com espaços/pontos/traços: telefone
  /\b(whats\w*|zap\w*|wpp|insta(gram)?|telegram)\b/i,
  /@[a-z0-9_.]{3,}/i, // @perfil
];

export const mentionsContact = (text: string) =>
  CONTACT_PATTERNS.some((pattern) => pattern.test(text));
