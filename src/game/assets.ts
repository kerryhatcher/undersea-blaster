// Shared game assets management

// SVG sprite definitions
const svgSponge = `<?xml version='1.0'?>
  <svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'>
    <defs>
      <radialGradient id='g' cx='50%' cy='40%' r='70%'>
        <stop offset='0%' stop-color='#ffd94d'/>
        <stop offset='100%' stop-color='#f2b800'/>
      </radialGradient>
    </defs>
    <rect x='6' y='10' rx='12' ry='12' width='68' height='58' fill='url(#g)' stroke='#9c7a00' stroke-width='3'/>
    <g fill='#d89e00' opacity='0.6'>
      <circle cx='18' cy='24' r='3'/>
      <circle cx='32' cy='18' r='2.5'/>
      <circle cx='52' cy='22' r='3'/>
      <circle cx='44' cy='34' r='2.8'/>
      <circle cx='22' cy='42' r='3'/>
      <circle cx='60' cy='46' r='2.4'/>
      <circle cx='36' cy='54' r='2.8'/>
    </g>
  </svg>`;

const svgPatty = `<?xml version='1.0'?>
  <svg xmlns='http://www.w3.org/2000/svg' width='72' height='56' viewBox='0 0 72 56'>
    <g>
      <ellipse cx='36' cy='16' rx='32' ry='14' fill='#f9c46b' stroke='#b67a2b' stroke-width='3'/>
      <rect x='8' y='24' width='56' height='10' rx='5' fill='#6d3b19'/>
      <ellipse cx='36' cy='40' rx='32' ry='12' fill='#eaa84f' stroke='#a36724' stroke-width='3'/>
      <path d='M10 28 Q 20 35 30 28 T 62 28' stroke='#3a8f2e' stroke-width='6' fill='none'/>
    </g>
  </svg>`;

// Helper function to convert SVG to Image
function svgToImage(svg: string): HTMLImageElement {
  const img = new Image();
  img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  return img;
}

// Asset loading states
export interface GameAssets {
  playerImg: HTMLImageElement;
  pattyImg: HTMLImageElement;
  isLoaded: boolean;
}

// Create and load game assets
export async function loadGameAssets(): Promise<GameAssets> {
  const playerImg = svgToImage(svgSponge);
  const pattyImg = svgToImage(svgPatty);
  
  // Wait for both images to load
  await Promise.all([
    new Promise((resolve, reject) => {
      playerImg.onload = resolve;
      playerImg.onerror = reject;
    }),
    new Promise((resolve, reject) => {
      pattyImg.onload = resolve;
      pattyImg.onerror = reject;
    })
  ]);
  
  return {
    playerImg,
    pattyImg,
    isLoaded: true
  };
}

// Synchronous asset creation (for backward compatibility)
export function createGameAssets(): GameAssets {
  return {
    playerImg: svgToImage(svgSponge),
    pattyImg: svgToImage(svgPatty),
    isLoaded: false // Will load asynchronously
  };
}

// Export individual assets for gradual migration
export { svgSponge, svgPatty, svgToImage };