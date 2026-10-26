import { expoClient } from '@better-auth/expo/client';
import { inferAdditionalFields, phoneNumberClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333';

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    // No celular a sessão fica no SecureStore; na web o plugin usa os cookies do navegador
    expoClient({ scheme: 'maoaobra', storagePrefix: 'maoaobra', storage: SecureStore }),
    phoneNumberClient(),
    inferAdditionalFields({ user: { role: { type: 'string', input: false } } }),
  ],
});
