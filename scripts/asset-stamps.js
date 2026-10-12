'use strict';

/*
 * Content-hash cache busting for src/index.html. nginx serves src/ directly
 * with "Cache-Control: public, max-age=2592000, immutable", so a browser
 * keeps js/feed.js?v=X for 30 days and only a NEW query string makes it
 * fetch again. The old ?v=<package version> stamp was written only into
 * dist/ (never served) and the version was rarely bumped, so returning
 * visitors kept running week-old scripts after a deploy (reported live: the
 * "(latest: ...)" bracket was deployed but never showed). Each link now
 * carries an 8-character hash of its own file's content: any change to a
 * file changes its URL, nothing to remember.
 *
 *   stamp(srcDir)  rewrites src/index.html in place (run by `npm run build`)
 *   check(srcDir)  lists links whose stamp does not match (run by lint)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LINK_RX = /((?:href|src)="((?:js\/[A-Za-z0-9_-]+\.js)|(?:styles\.css)))\?v=([^"]*)"/g;

function hashOf(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
}

function stamp(srcDir) {
  const indexPath = path.join(srcDir, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  const out = html.replace(LINK_RX, (m, attr, rel) => `${attr}?v=${hashOf(path.join(srcDir, rel))}"`);
  if (out !== html) fs.writeFileSync(indexPath, out);
  return out !== html;
}

function check(srcDir) {
  const html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
  const stale = [];
  for (const m of html.matchAll(LINK_RX)) {
    const want = hashOf(path.join(srcDir, m[2]));
    if (m[3] !== want) stale.push(`${m[2]}: ?v=${m[3]} should be ?v=${want}`);
  }
  return stale;
}

module.exports = { stamp, check, hashOf };

if (require.main === module) {
  const srcDir = path.resolve(__dirname, '..', 'src');
  if (process.argv.includes('--check')) {
    const stale = check(srcDir);
    if (stale.length) {
      console.error(`Asset stamps out of date (run npm run build and commit src/index.html):\n  ${stale.join('\n  ')}`);
      process.exit(1);
    }
    console.log('Asset stamps: ok');
  } else {
    console.log(stamp(srcDir) ? 'Asset stamps: updated src/index.html' : 'Asset stamps: already current');
  }
}
