import type { Point } from '@maoaobra/shared';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';

const CACERES_CENTER: Point = { lat: -16.0705, lng: -57.6789 };

/**
 * Posição atual do aparelho. Sem permissão, usa o centro de Cáceres (precise = false).
 * ponytail: piloto numa cidade só; trocar o fallback por geocodificação de CEP ao expandir.
 */
export async function getCurrentPoint(): Promise<{ point: Point; precise: boolean }> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return { point: CACERES_CENTER, precise: false };
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { point: { lat: coords.latitude, lng: coords.longitude }, precise: true };
  } catch {
    return { point: CACERES_CENTER, precise: false };
  }
}

export const useCurrentPoint = () =>
  useQuery({ queryKey: ['location'], queryFn: getCurrentPoint, staleTime: 5 * 60_000 });
