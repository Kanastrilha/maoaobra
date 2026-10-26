// Direção "vermelho com disciplina": o vermelho é da marca e da seleção; status têm cores próprias
export const colors = {
  primary: '#C81E36',
  primaryTint: '#FDECEE',
  text: '#18181B',
  muted: '#5B5B63',
  border: '#E4E4E7',
  surface: '#F4F4F5',
  background: '#FFFFFF',
  white: '#FFFFFF',
};

export const tones = {
  warning: { background: '#FBEBC8', text: '#7A4F00' },
  success: { background: '#DCF2E6', text: '#1F7A4D' },
  danger: { background: '#FDECEE', text: '#A3172B' },
  neutral: { background: '#F4F4F5', text: '#52525B' },
};

export type Tone = keyof typeof tones;
