// Device profile, decided once at startup. Phones get lighter textures, smaller shadow maps,
// no contact-shadow pass and a lower pixel-ratio ceiling; reading happens in the HTML label view.

const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const small = typeof window !== 'undefined' && Math.min(window.screen?.width ?? 1200, window.innerWidth) < 820;

export const MOBILE = coarse || small;

export const QUALITY = MOBILE
  ? { labelRes: 0.5, shadowMap: 1024, maxDpr: 2, contactShadows: false, envRes: 64, segments: 64 }
  : { labelRes: 1, shadowMap: 2048, maxDpr: 2, contactShadows: true, envRes: 256, segments: 160 };
