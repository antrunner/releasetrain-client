const { test, expect } = require('@playwright/test');

/*
 * The per-version stability chip (feed.js): a release doc carrying the
 * server-computed `stability` (0-1, deterministic - see the server's
 * src/stability.js) renders a tinted chip on its row, with the server's
 * own stabilityReasoning sentence as the hover title so the number is
 * never a bare, unexplained value. Band tint: ok >= 0.7, warn >= 0.4,
 * bad below that. A doc with no score (older than the backfill) gets no
 * chip at all - never a fabricated one.
 */

test.beforeEach(async ({ page }) => {
  await page.route(/\/api\//, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.goto('/');
});

function renderRows(stabilityFields) {
  const group = {
    name: 'Chrome',
    items: [
      {
        versionProductName: 'chrome',
        versionNumber: '130.0.1',
        versionReleaseDate: '20261001',
        versionReleaseChannel: 'patch',
        ...stabilityFields,
      },
    ],
  };
  const node = renderComponentNode(group, 0);
  const chip = node.querySelector('.chip[title]');
  const stabChip = Array.from(node.querySelectorAll('.chip')).find((c) =>
    c.textContent.includes('stability'),
  );
  return {
    text: stabChip ? stabChip.textContent : null,
    cls: stabChip ? stabChip.className : null,
    title: stabChip ? stabChip.getAttribute('title') : null,
    anyTitled: !!chip,
  };
}

test('a scored release doc renders the stability chip with its reasoning as the title', async ({
  page,
}) => {
  const r = await page.evaluate(renderRows, {
    stability: 0.9,
    stabilityReasoning: '0.90: patch version bump, no known CVE, no community posts matched.',
  });
  expect(r.text).toBe('⚖️ stability 0.90');
  expect(r.cls).toContain('ok');
  expect(r.title).toContain('patch version bump');
});

test('band tint follows the score: mid scores warn, low scores bad', async ({ page }) => {
  const warn = await page.evaluate(renderRows, { stability: 0.55, stabilityReasoning: 'x' });
  expect(warn.cls).toContain('warn');
  const bad = await page.evaluate(renderRows, { stability: 0.15, stabilityReasoning: 'x' });
  expect(bad.cls).toContain('bad');
});

test('an unscored doc renders no stability chip at all', async ({ page }) => {
  const r = await page.evaluate(renderRows, {});
  expect(r.text).toBeNull();
});
