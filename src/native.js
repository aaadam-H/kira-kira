// Integrasi Android (Capacitor). Di browser semua fungsi ini tak buat apa-apa.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export const isNative = Capacitor.isNativePlatform();

// onBack() pulangkan 'exit' bila berada di menu utama
export function initNative({ onBack, onPause }) {
  if (!isNative) return;
  App.addListener('backButton', () => {
    if (onBack() === 'exit') App.minimizeApp();
  });
  App.addListener('pause', () => onPause?.());
}
