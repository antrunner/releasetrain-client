const { test, expect } = require('@playwright/test');

/*
 * Mobile touch scrolling over the Recent Updates list - reported live:
 * "the scrolling only works if you scroll the header." Root cause: at
 * <=640px the #feedPanel media override sets overflow: visible, but the
 * later no-sideways-scroll rule (#feedPanel { overflow-x: hidden })
 * wins the cascade, and overflow-x:hidden forces computed overflow-y
 * back to auto - so the panel stayed a (zero-excess) scroll container,
 * and the base rule's overscroll-behavior: contain swallowed every
 * vertical swipe over the list instead of chaining it to the page.
 * The fix resets overscroll-behavior: auto in the same media block;
 * this spec drives a REAL synthesized touch swipe (CDP
 * Input.dispatchTouchEvent, not wheel - wheel never hit the bug) over
 * the middle of the list and asserts the page actually scrolled.
 */

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

// Enough distinct components, all dated today, that the mobile feed is
// several screens tall without expanding any group.
function mockVersions() {
  const today = new Date();
  const d = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  return Array.from({ length: 30 }, (_, i) => ({
    _id: `m${i}`,
    versionId: `comp-${i}-1.0.${i}`,
    versionProductName: `Component ${i}`,
    versionNumber: `1.0.${i}`,
    versionReleaseChannel: 'patch',
    versionReleaseDate: d,
    isCve: false,
  }));
}

async function swipeUp(context, page, x, y, dy) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y - (dy * i) / steps }],
    });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('a touch swipe over the middle of the feed list scrolls the page', async ({
  page,
  context,
}) => {
  await page.route(/\/api\//, (route) => {
    const url = route.request().url();
    let body = '[]';
    if (/\/v\/search/.test(url)) body = JSON.stringify({ data: mockVersions(), nextCursor: null });
    else if (/\/count/.test(url)) body = '{}';
    return route.fulfill({ status: 200, contentType: 'application/json', body });
  });
  await page.goto('/');
  await expect(page.locator('.feedGroup').first()).toBeVisible({ timeout: 20_000 });

  // The page must actually be taller than the viewport for this to mean anything.
  const tall = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight + 200,
  );
  expect(tall).toBe(true);

  const before = await page.evaluate(() => window.scrollY);
  // Swipe over the middle of the LIST (well below the panel header),
  // the exact area reported as dead on a phone.
  await swipeUp(context, page, 195, 600, 300);
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.scrollY);
  expect(after, 'touch swipe over the feed list must scroll the page').toBeGreaterThan(before);
});
