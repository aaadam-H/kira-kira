// Sediakan / kemas kini projek Android.
//   npm run android:setup
// Selamat dijalankan berulang kali. Kalau kau tukar appId, padam folder android/ dulu, kemudian jalankan semula.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const run = (cmd) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
};

// 1. Build web app
run('npm run build');

// 2. Cipta projek Android jika belum ada
if (!existsSync('android')) run('npx cap add android');

// 3. Jana ikon dan splash dari folder assets/
run('npx capacitor-assets generate --android --iconBackgroundColor "#eaf6ff" --splashBackgroundColor "#eaf6ff" --splashBackgroundColorDark "#eaf6ff"');

// 4. Kunci orientasi potret (game direka untuk skrin menegak)
const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let manifest = readFileSync(manifestPath, 'utf8');
if (!manifest.includes('android:screenOrientation')) {
  manifest = manifest.replace(/<activity\b/, '<activity\n            android:screenOrientation="portrait"');
  writeFileSync(manifestPath, manifest);
  console.log('✔ Orientasi dikunci ke potret');
}

// 5. Selaraskan versi app dengan package.json (versionCode mesti naik setiap kali upload ke Play Store)
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const [major, minor, patch] = version.split('.').map(Number);
const versionCode = major * 10000 + minor * 100 + patch;
const gradlePath = 'android/app/build.gradle';
let gradle = readFileSync(gradlePath, 'utf8');
gradle = gradle
  .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
  .replace(/versionName\s+"[^"]*"/, `versionName "${version}"`);
writeFileSync(gradlePath, gradle);
console.log(`✔ Versi ${version} (versionCode ${versionCode})`);

// 6. Salin web app dan plugin ke Android
run('npx cap sync android');
console.log('\nSiap. Buka dengan: npm run android:open');
