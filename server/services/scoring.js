// Legacy questions without a marks field retain the original one-mark default.
function questionMarks(question) {
  const marks = question.marks === undefined ? 1 : question.marks;
  if (typeof marks !== 'number' || !Number.isFinite(marks) || marks < 1 || marks > Number.MAX_SAFE_INTEGER) {
    throw new Error('Question marks must be a finite number of at least 1 within the safe range');
  }
  return marks;
}

// Sum the decimal values as entered, avoiding totals such as 3.5999999999999996.
function sumMarks(values) {
  const parts = values.map(value => {
    const [decimal, exponent = '0'] = String(value).split('e');
    const [whole, fraction = ''] = decimal.split('.');
    return { units: BigInt(whole + fraction), scale: fraction.length - Number(exponent) };
  });
  const scale = parts.reduce((maximum, part) => Math.max(maximum, part.scale), 0);
  const total = parts.reduce((sum, part) => sum + part.units * 10n ** BigInt(scale - part.scale), 0n);
  if (total > BigInt(Number.MAX_SAFE_INTEGER) * 10n ** BigInt(scale)) throw new Error('Total marks exceed the safe range');
  return Number(`${total}e-${scale}`);
}

function maximumMarks(questions) {
  const maximum = sumMarks(questions.map(questionMarks));
  if (!Number.isFinite(maximum) || maximum > Number.MAX_SAFE_INTEGER) throw new Error('Total marks exceed the safe range');
  return maximum;
}

module.exports = { questionMarks, maximumMarks, sumMarks };
