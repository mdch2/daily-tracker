import { randomUUID } from 'expo-crypto';
import { deviceStorage } from '../storage/device-storage';
import { createChunkedStorage } from './chunked-storage';

export function createSessionStorage() {
  return createChunkedStorage(deviceStorage, randomUUID);
}
