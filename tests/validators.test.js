const { isValidEmail, isValidUrl } = require('../src/utils/validators');

describe('isValidEmail', () => {
  test('accepts a well-formed email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  test('rejects a string without @', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
  });

  test('rejects non-string input', () => {
    expect(isValidEmail(undefined)).toBe(false);
  });
});

describe('isValidUrl', () => {
  test('accepts http and https URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://example.com/path?q=1')).toBe(true);
  });

  test('rejects non-http protocols', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
  });

  test('rejects malformed URLs', () => {
    expect(isValidUrl('not a url')).toBe(false);
  });
});
