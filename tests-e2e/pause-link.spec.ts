import { test, expect } from '@playwright/test';

test('inspect pause link @inspect-pause-link', async ({ page, context }) => {
  await page.goto('/');

  // Ensure initial pause state (game is paused by default)
  const pauseLink = page.locator('#pause-link');
  await expect(pauseLink).toBeVisible({ timeout: 5000 });

  // Log computed styles to stdout
  const styles = await page.evaluate(() => {
    const el = document.querySelector('#pause-link') as HTMLElement | null;
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      text: el.textContent,
      display: s.display,
      color: s.color,
      font: s.font,
      zIndex: s.zIndex,
      position: s.position,
      bottom: s.bottom,
      left: s.left,
      transform: s.transform,
      opacity: s.opacity,
    };
  });
  console.log('PAUSE_LINK_STYLES', styles);

  // Capture screenshots for visual inspection
  await page.screenshot({ path: 'pause-screen.png' });
  const bb = await pauseLink.boundingBox();
  console.log('PAUSE_LINK_BB', bb);
  if (bb) {
    await page.screenshot({
      path: 'pause-link.png',
      clip: { x: bb.x, y: bb.y, width: Math.max(1, bb.width), height: Math.max(1, bb.height) },
    });
  }

  // Verify clicking the link opens a new tab (and does not unpause the game)
  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    pauseLink.click(),
  ]);
  await newPage.waitForLoadState('domcontentloaded');
  console.log('NEW_PAGE_URL', newPage.url());
});


