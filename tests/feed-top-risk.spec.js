const { test, expect } = require('@playwright/test');

/*
 * "Highest risk now" (feed.js loadTopRisk, server GET
 * /api/insights/top-risk). Reported live: "a brief summary per component
 * then each version a list item, the source in brackets", "the ten with
 * the highest risk (lowest score) but explain in a brief paragraph", "at
 * the top add date and time so it looks like press summary, from when it
 * was pulled", "and human readable", "keep mobile friendly in mind".
 */

const PULLED = '2026-10-12T09:41:00.000Z';
const DATA = {
  day: '2026-10-12',
  pulledAt: PULLED,
  components: [
    {
      rank: 1,
      name: 'redis',
      version: '8.2.2',
      releaseDate: '20261011',
      stability: 0.35,
      stabilityReasoning: '0.35: patch version bump, known CVE CVE-2025-49844.',
      primaryUrl: 'https://github.com/redis/redis/releases/tag/8.2.2',
      status: 'ready',
      summary: {
        answer:
          'Redis 8.2.2 carries risk from a Lua use-after-free ([CVE-2025-49844](https://nvd.nist.gov/vuln/detail/CVE-2025-49844)).',
        generatedAt: '2026-10-12T09:30:00.000Z',
        sources: [
          {
            kind: 'cve',
            title: 'CVE-2025-49844',
            url: 'https://nvd.nist.gov/vuln/detail/CVE-2025-49844',
          },
          {
            kind: 'web',
            title: 'Redis security advisory',
            url: 'https://redis.io/blog/security-advisory',
          },
        ],
      },
      versions: [
        {
          version: '8.2.2',
          date: '20261011',
          stability: 0.35,
          notes:
            'Fix crashes when a module thread pauses IO threads, a very long note that must wrap on a phone rather than push the page sideways',
          url: 'https://releasetrain.io/api/v/a1',
          commit: '7939a8b',
          commitUrl: 'https://github.com/redis/redis/commit/7939a8b0aaaa',
        },
        {
          version: '8.2.1',
          date: '20261001',
          stability: 0.9,
          notes: '',
          url: 'https://releasetrain.io/api/v/b1',
          commit: null,
          commitUrl: null,
          primaryUrl: 'https://github.com/redis/redis/releases/tag/8.2.1',
        },
      ],
    },
    {
      rank: 2,
      name: 'php',
      version: '8.3.35',
      releaseDate: '20261008',
      stability: 0.53,
      stabilityReasoning:
        '0.53: patch version bump, no known CVE, 9 of 20 community posts since its 2026-10-08 release flagged risky.',
      status: 'pending',
      summary: null,
      versions: [],
    },
  ],
};

async function open(page) {
  await page.route(/\/api\//, (route) => {
    if (route.request().url().includes('/api/insights/top-risk')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(DATA),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.goto('/?view=feed');
  await expect(page.locator('#topRiskPanel')).toBeVisible({ timeout: 20_000 });
}

test('dateline reads like a press summary, from the pull time, human readable', async ({
  page,
}) => {
  await open(page);
  const dl = page.locator('#topRiskDateline');
  await expect(dl).toHaveAttribute('datetime', PULLED);
  const text = await dl.textContent();
  expect(text).toMatch(/2026/);
  expect(text).toMatch(/October/);
  expect(text).toMatch(/ago|just now/);
});

test('rows rank by risk; a card shows the paragraph with bracketed sources and one list item per version', async ({
  page,
}) => {
  await open(page);
  await expect(page.locator('.tr-item')).toHaveCount(2);
  await expect(page.locator('.tr-name').first()).toHaveText('redis 8.2.2');
  await expect(page.locator('.tr-score').first()).toHaveText('0.35');
  await page.locator('.tr-head').first().click();
  const card = page.locator('.tr-card').first();
  await expect(card.locator('.tr-paragraph')).toContainText('Lua use-after-free');
  // the CVE link is cited inline; the release's primary source is always
  // appended in brackets; the uncited web source (redis.io) is not shown
  await expect(card.locator('.tr-paragraph a.tr-src')).toHaveText(['[primary: github.com]']);
  await expect(card.locator('.tr-paragraph')).not.toContainText('redis.io');
  await expect(card.locator('.tr-written')).toContainText('Written');
  await expect(card.locator('.tr-versions li')).toHaveCount(2);
  await expect(card.locator('.tr-versions li').first().locator('a.tr-src')).toHaveText([
    '[7939a8b]',
    '[ReleaseTrain]',
  ]);
  await expect(card.locator('.tr-versions li').nth(1).locator('a.tr-src')).toHaveText([
    '[release]',
    '[ReleaseTrain]',
  ]);
  await expect(card.locator('.tr-versions li').first()).toContainText('Oct 11, 2026');
  await expect(card.locator('.vi-chart circle')).toHaveCount(2);
});

test('a component whose paragraph is not ready yet says so', async ({ page }) => {
  await open(page);
  await page.locator('.tr-head').nth(1).click();
  await expect(page.locator('.tr-card').nth(1).locator('.tr-pending')).toHaveText(
    'Summary being prepared…',
  );
});

test('mobile: an opened card never scrolls the page sideways', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await open(page);
  await page.locator('.tr-head').first().click();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
