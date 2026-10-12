const { test, expect } = require('@playwright/test');

/*
 * Commit id after the version title (feed.js commitIdFor). github.py
 * stores one doc per commit under the repo's latest tag number, so rows
 * read identically ("v2rayN 7.25.6" three times). Reported live: "since
 * the versions are the same add the build version or commit." Older docs
 * carry the sha only as versionId's 12-hex suffix; newer ones carry an
 * explicit versionCommit. Non-github docs never get a commit label, even
 * when their versionId happens to end in hex digits.
 */

test.beforeEach(async ({ page }) => {
  await page.route(/\/api\//, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.goto('/');
});

function render(items) {
  const node = renderComponentNode({ name: 'v2rayN', items }, 0);
  document.body.appendChild(node);
  const out = Array.from(node.querySelectorAll('.titleRow')).map((row) => {
    const c = row.querySelector('.ver-commit');
    return c ? { text: c.textContent, href: c.getAttribute('href'), title: c.title } : null;
  });
  node.remove();
  return out;
}

const base = {
  sourceBot: 'github.py',
  versionProductName: 'v2rayN',
  versionNumber: '7.25.6',
  versionReleaseDate: '20261011',
  versionReleaseChannel: 'patch',
  versionReleaseComments: '2dust/v2rayN on master',
};

test('old github.py docs show the versionId sha suffix, linked to the commit', async ({ page }) => {
  const rows = await page.evaluate(render, [
    { ...base, _id: 'a', versionId: '20261011v2rayN7.25.64869a6cbba40' },
    { ...base, _id: 'b', versionId: '20261011v2rayN7.25.6fbf822d74c80' },
  ]);
  const texts = rows.map((r) => r?.text).sort();
  expect(texts).toEqual(['(4869a6c)', '(fbf822d)']);
  const first = rows.find((r) => r.text === '(4869a6c)');
  expect(first.href).toBe('https://github.com/2dust/v2rayN/commit/4869a6cbba40');
});

test('an explicit versionCommit wins over the versionId suffix', async ({ page }) => {
  const rows = await page.evaluate(render, [
    {
      ...base,
      _id: 'c',
      versionId: '20261011v2rayN7.25.61cde521d75de',
      versionCommit: '1cde521d75de0123456789abcdef0123456789ab',
    },
  ]);
  expect(rows[0].text).toBe('(1cde521)');
  expect(rows[0].href).toBe(
    'https://github.com/2dust/v2rayN/commit/1cde521d75de0123456789abcdef0123456789ab',
  );
});

test('non-github docs never get a commit label', async ({ page }) => {
  const rows = await page.evaluate(render, [
    { ...base, _id: 'd', sourceBot: 'chrome.py', versionId: '20261011chrome130deadbeefcafe' },
  ]);
  expect(rows[0]).toBeNull();
});

test('a build number, when a doc has one, is shown in brackets instead of the commit', async ({
  page,
}) => {
  const rows = await page.evaluate(render, [
    { ...base, _id: 'e', versionId: '20261011v2rayN7.25.62407d44f4f8d', versionBuild: '1842' },
  ]);
  expect(rows[0].text).toBe('(build 1842)');
});
