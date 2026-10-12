const { test, expect } = require('@playwright/test');

/*
 * The per-version stability score (feed.js): a release doc carrying the
 * server-computed `stability` (0-1, deterministic - see the server's
 * src/stability.js) shows it appended right after its version title
 * ("pls append the stability score to each version"), as quiet
 * band-tinted text (.stab-inline), not a pill, with the server's own
 * stabilityReasoning sentence as the hover title. Band: ok >= 0.7, warn
 * >= 0.4, bad below. A doc with no score (not yet backfilled) shows
 * nothing - never a fabricated value. Also covers the flattened row
 * chips ("the round buttons do not look integrated ... more subtle"):
 * no pill border or background inside a feed row.
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
        _id: 'abc',
        versionProductName: 'chrome',
        versionNumber: '130.0.1',
        versionReleaseDate: '20261001',
        versionReleaseChannel: 'patch',
        ...stabilityFields,
      },
    ],
  };
  const node = renderComponentNode(group, 0);
  document.body.appendChild(node);
  const stab = node.querySelector('.titleRow .stab-inline');
  const chip = node.querySelector('.chips .chip');
  const cs = chip ? getComputedStyle(chip) : null;
  const out = {
    text: stab ? stab.textContent : null,
    cls: stab ? stab.className : null,
    title: stab ? stab.getAttribute('title') : null,
    afterTitleLink: stab ? stab.previousElementSibling?.tagName === 'A' : null,
    chipBorder: cs ? cs.borderTopStyle : null,
    chipBg: cs ? cs.backgroundColor : null,
    stabChipInChips: Array.from(node.querySelectorAll('.chips .chip')).some((c) =>
      c.textContent.includes('stability'),
    ),
  };
  node.remove();
  return out;
}

test('a scored release shows its stability right after the version title, with the reasoning as title', async ({
  page,
}) => {
  const r = await page.evaluate(renderRows, {
    stability: 0.9,
    stabilityReasoning: '0.90: patch version bump, no known CVE, no community posts matched.',
  });
  expect(r.text).toBe('stability 0.90');
  expect(r.afterTitleLink).toBe(true);
  expect(r.cls).toContain('stab-ok');
  expect(r.title).toContain('patch version bump');
  expect(r.stabChipInChips).toBe(false);
});

test('band tint follows the score: mid scores warn, low scores bad', async ({ page }) => {
  const warn = await page.evaluate(renderRows, { stability: 0.55, stabilityReasoning: 'x' });
  expect(warn.cls).toContain('stab-warn');
  const bad = await page.evaluate(renderRows, { stability: 0.15, stabilityReasoning: 'x' });
  expect(bad.cls).toContain('stab-bad');
});

test('an unscored doc shows no stability text at all', async ({ page }) => {
  const r = await page.evaluate(renderRows, {});
  expect(r.text).toBeNull();
});

test('row chips render flat: no pill border or background', async ({ page }) => {
  const r = await page.evaluate(renderRows, {});
  expect(r.chipBorder).toBe('none');
  expect(r.chipBg).toBe('rgba(0, 0, 0, 0)');
});
