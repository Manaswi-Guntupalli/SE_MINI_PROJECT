// Bounded, linear checks instead of a backtracking expression on account input.
function isValidEmail(value) {
  if (typeof value !== 'string' || value.length > 254 || /\s/.test(value)) return false;
  const separator = value.indexOf('@');
  const lastDot = value.lastIndexOf('.');
  return separator > 0 && separator === value.lastIndexOf('@') &&
    lastDot > separator + 1 && lastDot < value.length - 1;
}

module.exports = { isValidEmail };
