// Simpan setting dan rekod dalam phone sahaja (tiada server, tiada data peribadi).
// localStorage berfungsi dalam browser dan juga dalam Capacitor WebView.
// Kalau nanti nak lebih kukuh di Android, boleh tukar ke @capacitor/preferences.
const KEY = 'kirakira:v1';

export function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage penuh atau disekat: game tetap boleh main */
  }
}
