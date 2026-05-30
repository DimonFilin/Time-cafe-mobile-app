import { sharedApi } from '../config/api';

export async function registerPushToken(pushToken: string): Promise<void> {
  await sharedApi.patch('/users/me/push-token', { pushToken });
}
