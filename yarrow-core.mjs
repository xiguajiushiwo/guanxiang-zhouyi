export function drawYarrowChange(stalks, left) {
  const total = Number(stalks);
  if (!Number.isInteger(total) || total < 3 || (total % 4 !== 0 && total !== 49)) {
    throw new RangeError('stalks must be a valid yarrow total');
  }
  const leftCount = Math.max(1, Math.min(total - 2, Math.round(Number(left))));
  const right = total - leftCount;
  const rightAfter = right - 1;
  const leftR = leftCount % 4 || 4;
  const rightR = rightAfter % 4 || 4;
  const removed = 1 + leftR + rightR;
  return { before: total, left: leftCount, right, rightAfter, leftR, rightR, removed, remaining: total - removed };
}

export function randomSplitCount(stalks, random = Math.random) {
  const unit = Math.max(0, Math.min(0.999999999999, Number(random())));
  const ratio = 0.28 + unit * 0.44;
  return Math.max(1, Math.min(stalks - 2, Math.round(stalks * ratio)));
}

export function castLineFromSplits(splits) {
  if (!Array.isArray(splits) || splits.length !== 3) throw new TypeError('three split values are required');
  let stalks = 49;
  const changes = splits.map(split => {
    const change = drawYarrowChange(stalks, split);
    stalks = change.remaining;
    return change;
  });
  return { value: stalks / 4, changes };
}

export function castRandomLine(random = Math.random) {
  let stalks = 49;
  const changes = [];
  for (let index = 0; index < 3; index += 1) {
    const change = drawYarrowChange(stalks, randomSplitCount(stalks, random));
    changes.push(change);
    stalks = change.remaining;
  }
  return { value: stalks / 4, changes };
}

export function castRandomHexagram(random = Math.random) {
  return Array.from({ length: 6 }, () => castRandomLine(random));
}
