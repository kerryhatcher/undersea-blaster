export function shouldPlayAlternate(currentIndex: number): { play: boolean; nextIndex: number } {
  const play = (currentIndex % 2) === 0;
  return { play, nextIndex: currentIndex + 1 };
}


