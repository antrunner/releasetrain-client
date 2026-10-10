const { test, expect } = require('@playwright/test');

/*
 * Regression test for the XSS fixes flagged by the architecture review:
 * scraped/catalog data (a component's name, bot-collected release-notes
 * text) used to reach innerHTML unescaped in renderComponentNode
 * (feed.js), so a crafted release note or product name could inject
 * real elements into the feed. These assert the payloads render as
 * literal text - element injection stays dead even if someone later
 * refactors the render path. See also the matching aEsc() fix in
 * arch.js's inventory-details rendering (not covered here: it needs a
 * signed-in inventory flow; this guards the shared escape-at-the-sink
 * convention where the scraped-content exposure is).
 */

test.beforeEach(async ({ page }) => {
  await page.route(/\/api\//, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.goto('/');
});

test('renderComponentNode escapes a hostile component name and release-notes text', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const group = {
      name: '<img src=x onerror="window.__xssName=1">evil-component',
      items: [
        {
          versionProductName: 'evil-component',
          versionNumber: '1.0.0',
          versionReleaseDate: '2026-01-02',
          versionReleaseChannel: 'major',
          versionReleaseNotes: '<img src=x onerror="window.__xssNotes=1">a crafted release note',
          sourceBot: 'github.py',
        },
      ],
    };
    const node = renderComponentNode(group);
    document.body.appendChild(node);
    node.open = true;
    return {
      injectedName: typeof window.__xssName !== 'undefined',
      injectedNotes: typeof window.__xssNotes !== 'undefined',
      imgCount: node.querySelectorAll('img:not(.avatar)').length,
      headText: node.querySelector('.groupHead')?.textContent || '',
      metaText: node.querySelector('.meta')?.textContent || '',
    };
  });
  expect(result.injectedName).toBe(false);
  expect(result.injectedNotes).toBe(false);
  // No element materialized from either payload (the row's own avatar
  // <img> is the only image allowed in this group node).
  expect(result.imgCount).toBe(0);
  // The payloads survive as visible literal text, not as markup.
  expect(result.headText).toContain('<img src=x');
  expect(result.metaText).toContain('a crafted release note');
  expect(result.metaText).toContain('<img src=x');
});
