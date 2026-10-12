const { test, expect } = require('@playwright/test');

/*
 * The 10 least stable components at the top of Recent Updates (feed.js
 * loadTopRisk, server GET /api/insights/top-risk). Reported live: "keep the
 * highest risk, just remove the headline and reuse and extend the recent
 * updates", "brief one paragraph ... sources in round brackets (source:
 * reddit)", "only primary sources", "add the emojis (github, cve, reddit)
 * next to the source", "make the cve clickable", "include cisa exploited
 * cve if true", and "when loading them using the pipeline update the
 * pipeline state" (the main pipeline diagram mirrors the server's run).
 */

const PULLED = '2026-10-12T09:41:00.000Z';
const DATA = {
  day: '2026-10-12',
  pulledAt: PULLED,
  pipeline: { running: null, queued: [] },
  components: [
    {
      rank: 1,
      name: 'redis',
      version: '8.2.2',
      stability: 0.35,
      primaryUrl: 'https://github.com/redis/redis/releases/tag/8.2.2',
      kevCveId: 'CVE-2025-49844',
      status: 'ready',
      summary: {
        kind: 'pipeline',
        answer:
          'Redis is an in-memory key-value store [Redis docs](https://redis.io/docs/). Its latest release fixes module crashes [ReleaseTrain](https://releasetrain.io/api/v/a1). Meanwhile Reddit users report memory spikes [thread](https://www.reddit.com/r/redis/comments/abc/). CVE-2025-49844 may require an update to the latest version [NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-49844).',
      },
    },
    {
      rank: 2,
      name: 'strapi',
      version: '5.55.1',
      stability: 0.58,
      primaryUrl: 'https://github.com/strapi/strapi',
      kevCveId: null,
      status: 'pending',
      summary: {
        kind: 'facts',
        answer:
          'strapi 5.55.1 came out today, and its latest change is "guard RelativeTime against invalid dates" [release](https://github.com/strapi/strapi).',
      },
    },
  ],
};

async function open(page, { pipeline } = {}) {
  let pipelineCalls = 0;
  await page.route(/\/api\//, (route) => {
    const url = route.request().url();
    if (url.includes('/api/insights/top-risk')) {
      const body = pipeline ? { ...DATA, pipeline: pipeline(0) } : DATA;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    }
    if (url.includes('/api/insights/pipeline')) {
      pipelineCalls += 1;
      const body = pipeline ? pipeline(pipelineCalls) : { running: null, queued: [] };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.goto('/?view=feed');
  // Let startup requests settle: the app can switch views once they land.
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#topRiskPanel')).toBeVisible({ timeout: 20_000 });
  return () => pipelineCalls;
}

test('lives inside Recent Updates with no headline of its own; the header says least stable first', async ({
  page,
}) => {
  await open(page);
  await expect(page.locator('#feedPanel #topRiskPanel')).toHaveCount(1);
  await expect(
    page.locator('#topRiskPanel h2, #topRiskPanel h3, #topRiskPanel summary'),
  ).toHaveCount(0);
  await expect(page.locator('#topRiskPanel')).not.toContainText('Highest risk');
  await expect(page.locator('#feedWindowLabel')).toContainText(
    'the 2 least stable components first, then releases',
  );
  await expect(page.locator('#topRiskDateline')).toHaveAttribute('datetime', PULLED);
  await expect(page.locator('.tr-item')).toHaveCount(2);
});

test('citations carry emojis, CVE ids are clickable, CISA exploited is stated, primary sources only', async ({
  page,
}) => {
  await open(page);
  const story = page.locator('.tr-story').first();
  await expect(story.locator('a.tr-src')).toHaveText([
    '(🌐 source: redis.io)',
    '(💬 source: Reddit)',
    '(🔴 source: NVD)',
    '(🐙 source: GitHub)', // primary source appended: not cited inline
    '(⚠️ source: CISA)', // KEV note, since the paragraph never mentions CISA
  ]);
  await expect(story.locator('a.tr-cve').first()).toHaveAttribute(
    'href',
    'https://nvd.nist.gov/vuln/detail/CVE-2025-49844',
  );
  await expect(story).toContainText('CISA lists CVE-2025-49844 as known exploited');
  await expect(story.locator('a[href*="releasetrain.io"]')).toHaveCount(0);
  await expect(story).not.toContainText('🔥');
  const facts = page.locator('.tr-story').nth(1);
  await expect(facts.locator('a.tr-src')).toHaveText(['(🐙 source: GitHub)']);
});

test('the main pipeline diagram mirrors the server run, then finishes and the list refreshes', async ({
  page,
}) => {
  const running = {
    running: { name: 'strapi', phase: 'evaluating', detail: null, meta: { attempt: 1 } },
    queued: [],
  };
  const calls = await open(page, {
    pipeline: (n) => (n <= 6 ? running : { running: null, queued: [] }),
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          typeof askWorkflowState !== 'undefined' && askWorkflowState && askWorkflowState.evaluator,
      ),
    )
    .toBe('active');
  expect(await page.evaluate(() => askWorkflowQuestion)).toBe(
    'Summarizing strapi for Recent Updates',
  );
  await expect.poll(() => page.evaluate(() => askWorkflowFinished), { timeout: 30_000 }).toBe(true);
  const after = calls();
  await page.waitForTimeout(4500);
  expect(calls()).toBe(after); // polling stopped once idle
});

test('mobile: the list never scrolls the page sideways', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await open(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
