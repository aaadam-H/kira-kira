// Getaran ringan: plugin @capacitor/haptics dalam app, navigator.vibrate di browser.
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from './native.js';

let enabled = true;

export function setEnabled(value) {
  enabled = value;
}

export function buzz(kind) {
  if (!enabled) return;
  try {
    if (isNative) {
      const p = kind === 'wrong'
        ? Haptics.notification({ type: NotificationType.Error })
        : Haptics.impact({ style: ImpactStyle.Light });
      p.catch(() => {});
      return;
    }
    navigator.vibrate?.(kind === 'wrong' ? [60, 50, 60] : 25);
  } catch {
    /* peranti tak sokong getaran */
  }
}
