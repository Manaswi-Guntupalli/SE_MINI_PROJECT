// JavaScript dates have a smaller range than MAX_SAFE_INTEGER milliseconds.
// Durations shorter than a millisecond also collapse to an expired deadline.
function validDuration(duration, now = Date.now()) {
  return typeof duration === 'number' && Number.isFinite(duration) && duration * 60000 >= 1 &&
    Number.isFinite(new Date(now + duration * 60000).getTime());
}

module.exports = { validDuration };
