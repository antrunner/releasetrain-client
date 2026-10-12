const { test, expect } = require('@playwright/test');

/*
 * "Highest risk now" (feed.js loadTopRisk, server GET
 * /api/insights/top-risk). Reported live: "brief one paragraph for each
 * of the 10 components with sources in round brackets citation (source:
 * reddit or so)", "remove releasetrain from the sources, only primary
 * sources and make it a paragraph", "one integrated story paragraph",
 * "use round brackets for primary source", "update pipeline state while
 * running it through the pipeline when the page loads", plus the
 * press-summary dateline and "keep mobile friendly in mind".
 */

const PULLED = '2026-10-12T09:41:00.000Z';
const BASE = {
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
      status: 'ready',
      summary: {
        kind: 'pipeline',
        answer:
          'Redis is an in-memory key-value store [Redis docs](https://redis.io/docs/). Its latest release fixes crashes when a module thread pauses IO threads [ReleaseTrain](https://releasetrain.io/api/v/a1). In parallel, Reddit users report memory spikes after upgrading [thread](https://www.reddit.com/r/redis/comments/abc/). Also note CVE-2025-49844 may require an update to the latest version [NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-49844).',
      },
    },
    {
      rank: 2,
      name: 'strapi',
      version: '5.55.1',
      stability: 0.58,
      primaryUrl: 'https://github.com/strapi/strapi',
      status: 'pending',
      summary: {
        kind: 'facts',
        answer:
          'strapi 5.55.1 came out on Sep 29, 2026, and its latest change is "guard RelativeTime against invalid dates" [release](https://github.com/strapi/strapi). Reddit discussion since the release has not flagged problems.',
      },
    },
    {
      rank: 3,
      name: 'php',
      version: '8.3.35',
      stability: 0.75,
      primaryUrl: null,
      status: 'pending',
      summary: { kind: 'facts', answer: 'php 8.3.35 came out on Oct 8, 2026.' },
    },
  ],
};

async function open(page, data = BASE) {
  let calls = 0;
  await page.route(/\/api\//, (route) => {
    if (route.request().url().includes('/api/insights/top-risk')) {
      calls += 1;
      const body = typeof data === 'function' ? data(calls) : data;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.goto('/?view=feed');
  // Let the app finish its startup requests first: it can switch views
  // once they land, which made a visibility check right after load flaky.
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#topRiskPanel')).toBeVisible({ timeout: 20_000 });
  return () => calls;
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

test('one visible story paragraph per component, citations in round brackets, primary sources only', async ({
  page,
}) => {
  await open(page);
  await expect(page.locator('.tr-item')).toHaveCount(3);
  await expect(page.locator('.tr-name').first()).toHaveText('redis 8.2.2');
  const story = page.locator('.tr-story').first();
  await expect(story).toBeVisible(); // no click needed
  await expect(story).toContainText('Redis is an in-memory key-value store');
  await expect(story.locator('a.tr-src')).toHaveText([
    '(source: redis.io)',
    '(source: Reddit)',
    '(source: NVD)',
    '(source: GitHub)', // primary source, round brackets, appended since not cited
  ]);
  await expect(story).not.toContainText('ReleaseTrain');
  await expect(story.locator('a[href*="releasetrain.io"]')).toHaveCount(0);
  await expect(page.locator('#topRiskPanel ul, #topRiskPanel svg')).toHaveCount(0);
});

test('the fact-based story renders the same way, without a duplicate primary citation', async ({
  page,
}) => {
  await open(page);
  const story = page.locator('.tr-story').nth(1);
  await expect(story).toContainText('came out on Sep 29, 2026');
  await expect(story.locator('a.tr-src')).toHaveText(['(source: GitHub)']);
});

test('live pipeline state: running component and phase, queued ones, then polling stops when idle', async ({
  page,
}) => {
  const busy = {
    ...BASE,
    pipeline: { running: { name: 'strapi', phase: 'evaluating', detail: null }, queued: ['php'] },
  };
  const calls = await open(page, (n) => (n === 1 ? busy : BASE));
  await expect(page.locator('#topRiskPipeline')).toHaveText(
    '⚙️ Pipeline running for strapi: Evaluator: judging evidence · 1 queued',
  );
  await expect(page.locator('.tr-item').nth(1).locator('.tr-state')).toContainText(
    'The pipeline is writing a fuller summary: Evaluator: judging evidence',
  );
  await expect(page.locator('.tr-item').nth(2).locator('.tr-state')).toHaveText(
    'Queued for the pipeline.',
  );
  await expect(page.locator('.tr-item').first().locator('.tr-state')).toHaveCount(0); // already pipeline-written
  // the next poll reports idle: the line hides and polling stops
  await expect(page.locator('#topRiskPipeline')).toBeHidden({ timeout: 10_000 });
  const after = calls();
  await page.waitForTimeout(5000);
  expect(calls()).toBe(after);
});

test('mobile: the summaries never scroll the page sideways', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await open(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
