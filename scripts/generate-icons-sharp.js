import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const iconsDir = path.resolve('public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create an enhanced, ultra-crisp vector SVG logo for RotaPro
const svgLogo = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#0B132B"/>
    </radialGradient>
    <linearGradient id="routeGradient" x1="120" y1="400" x2="400" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0284C7"/>
      <stop offset="50%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#10B981"/>
    </linearGradient>
    <linearGradient id="shieldGrad" x1="160" y1="120" x2="352" y2="392" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2563EB"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
    <filter id="shadow" x="0" y="0" width="512" height="512" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- Background base -->
  <rect width="512" height="512" rx="128" fill="url(#bgGlow)"/>
  <rect x="6" y="6" width="500" height="500" rx="122" stroke="#283866" stroke-width="4"/>

  <!-- Route Track Arc -->
  <g filter="url(#shadow)">
    <path d="M140 370 C 120 260, 240 220, 220 150 C 200 90, 320 80, 360 140" 
          stroke="url(#routeGradient)" stroke-width="24" stroke-linecap="round" stroke-dasharray="1 1" fill="none"/>

    <!-- Central Location Pin -->
    <path d="M256 120 C 200.77 120, 156 165.54, 156 221.72 C 156 302.26, 256 400, 256 400 C 256 400, 356 302.26, 356 221.72 C 356 165.54, 311.23 120, 256 120 Z" 
          fill="url(#shieldGrad)" stroke="#38BDF8" stroke-width="8"/>

    <!-- Pin Inner Core -->
    <circle cx="256" cy="216" r="44" fill="#0B132B"/>
    
    <!-- Pro Checkmark -->
    <path d="M236 216 L 250 230 L 280 196" stroke="#10B981" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
`;

// Maskable SVG with safe margin (80% safe zone as required by W3C / Android)
const svgMaskable = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">
  <defs>
    <radialGradient id="bgGlowM" cx="50%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#0B132B"/>
    </radialGradient>
    <linearGradient id="shieldGradM" x1="160" y1="120" x2="352" y2="392" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2563EB"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
  </defs>

  <!-- Full bleed background for maskable -->
  <rect width="512" height="512" fill="url(#bgGlowM)"/>

  <!-- Centered content within safe circle (radius 200) -->
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <path d="M256 120 C 200.77 120, 156 165.54, 156 221.72 C 156 302.26, 256 400, 256 400 C 256 400, 356 302.26, 356 221.72 C 356 165.54, 311.23 120, 256 120 Z" 
          fill="url(#shieldGradM)" stroke="#38BDF8" stroke-width="10"/>
    <circle cx="256" cy="216" r="44" fill="#0B132B"/>
    <path d="M236 216 L 250 230 L 280 196" stroke="#10B981" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
`;

async function generate() {
  const svgBuffer = Buffer.from(svgLogo);
  const maskableBuffer = Buffer.from(svgMaskable);

  // Write base SVGs
  fs.writeFileSync(path.resolve('public/favicon.svg'), svgLogo);
  fs.writeFileSync(path.resolve('public/icons/icon.svg'), svgLogo);

  // Standard PNG icons
  await sharp(svgBuffer).resize(192, 192).png({ quality: 100 }).toFile(path.join(iconsDir, 'icon-192x192.png'));
  await sharp(svgBuffer).resize(512, 512).png({ quality: 100 }).toFile(path.join(iconsDir, 'icon-512x512.png'));

  // Maskable PNG icons (Android standard)
  await sharp(maskableBuffer).resize(192, 192).png({ quality: 100 }).toFile(path.join(iconsDir, 'icon-192x192-maskable.png'));
  await sharp(maskableBuffer).resize(512, 512).png({ quality: 100 }).toFile(path.join(iconsDir, 'icon-512x512-maskable.png'));

  // Apple Touch Icon
  await sharp(svgBuffer).resize(180, 180).png({ quality: 100 }).toFile(path.resolve('public/apple-touch-icon.png'));

  // Favicon PNG
  await sharp(svgBuffer).resize(64, 64).png().toFile(path.resolve('public/favicon-64x64.png'));
  await sharp(svgBuffer).resize(32, 32).png().toFile(path.resolve('public/favicon-32x32.png'));

  console.log('✅ All icons generated with Sharp successfully!');
}

generate().catch(console.error);
