const util = require('../util.js');
console.log(util);
describe('isFirstLetterAlphabetic', () => {
  it('should return true for strings starting with alphabetic characters', () => {
    expect(util.default.isFirstLetterAlphabetic('Test')).toBe(true);
  });

  it('should return false for strings not starting with alphabetic characters', () => {
    expect(util.default.isFirstLetterAlphabetic('123Test')).toBe(false);
    expect(util.default.isFirstLetterAlphabetic('')).toBe(false);
  });
});
