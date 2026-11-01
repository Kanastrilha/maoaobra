// Formatação, verificação matemática de CPF e cálculo geométrico.

/**
 * Mascaramento de CPF para exibição (ex: ***.456.789-**)
 */
export function maskCPF(cpf) {
  if (!cpf) return '—';
  const digits = String(cpf).replace(/\D/g, '');
  if (digits.length !== 11) return '***.***.***-**';
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

/**
 * Formata CPF (000.000.000-00)
 */
export function formatCPF(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/**
 * Formata Telefone/WhatsApp ((11) 90000-0000)
 */
export function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Verificação matemática dos dígitos de CPF. Não consulta a Receita Federal.
 */
export function isValidCPF(cpf) {
  const clean = String(cpf || '').replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(clean.charAt(10));
}

/**
 * Sanitiza objeto de usuário antes de armazenar em estado/localStorage,
 * garantindo que hashes ou senhas nunca vazem para o cliente.
 */
export function sanitizeUser(user) {
  if (!user) return null;
  const safeUser = { ...user };
  delete safeUser.senha;
  delete safeUser.passwordHash;
  return safeUser;
}

/**
 * Fórmula de Haversine para calcular distância real em quilômetros entre duas coordenadas (lat/lng).
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Fator de correção urbana (~1.25x para trajeto de rua vs linha reta)
  return (R * c * 1.25).toFixed(1);
}

