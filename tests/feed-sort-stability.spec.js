const { test, expect } = require('@playwright/test');

/*
 * "Least stable first" / "Most stable first" feed sorts ("add option sort
 * by stability asc and desc"). A component's key is its newest scored
 * release's server-computed stability; CVE docs never count; components
 * with no score sort last in BOTH directions (absent is not evidence).
 */

test.beforeEach(async ({ page }) => {
  await page.route(/\/api\//, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.goto('/');
});

const DOCS = [
  {
    versionProductName: 'alpha',
    versionNumber: '2.0.0',
    versionReleaseDate: '20261010',
    stability: 0.9,
  },
  // newest scored release wins (0.35), not the older 0.95
  {
    versionProductName: 'bravo',
    versionNumber: '3.0.0',
    versionReleaseDate: '20261011',
    stability: 0.35,
  },
  {
    versionProductName: 'bravo',
    versionNumber: '2.9.0',
    versionReleaseDate: '20261001',
    stability: 0.95,
  },
  {
    versionProductName: 'charlie',
    versionNumber: '1.0.1',
    versionReleaseDate: '20261009',
    stability: 0.6,
  },
  // unscored: only a CVE doc and an unscored release
  {
    versionProductName: 'delta',
    versionNumber: '1.0.0',
    versionReleaseDate: '20261012',
    isCve: true,
    stability: 0.1,
  },
  { versionProductName: 'delta', versionNumber: '1.0.0', versionReleaseDate: '20261011' },
];

for (const [mode, expected] of [
  ['stability-asc', ['Bravo', 'Charlie', 'Alpha', 'Delta']],
  ['stability-desc', ['Alpha', 'Charlie', 'Bravo', 'Delta']],
]) {
  test(`${mode} orders by the newest scored release, unscored last`, async ({ page }) => {
    const order = await page.evaluate(
      ([m, docs]) => {
        STATE.redditBySub = new Map();
        setFeedSort(m);
        return groupByComponentName(docs).map((g) => g.name);
      },
      [mode, DOCS],
    );
    expect(order).toEqual(expected);
  });
}

test('both stability options exist in the sort select', async ({ page }) => {
  const options = await page.locator('#feedSortSelect option').allTextContents();
  expect(options).toContain('Least stable first');
  expect(options).toContain('Most stable first');
});
