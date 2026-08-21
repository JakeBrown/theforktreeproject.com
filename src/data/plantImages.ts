import goldenWattleHero from '../assets/images/plants/golden-wattle-hero.jpg';
import grassDaisyHero from '../assets/images/plants/grass-daisy-hero.jpg';
import longPurpleFlagHero from '../assets/images/plants/long-purple-flag-hero.jpg';
import nativeLilacHero from '../assets/images/plants/native-lilac-hero.jpg';

const plantImages = {
  '/images/plants/golden-wattle-hero.jpg': goldenWattleHero,
  '/images/plants/grass-daisy-hero.jpg': grassDaisyHero,
  '/images/plants/long-purple-flag-hero.jpg': longPurpleFlagHero,
  '/images/plants/native-lilac-hero.jpg': nativeLilacHero,
} as const;

export function getPlantImage(src: string) {
  return plantImages[src as keyof typeof plantImages];
}
