const f = Math.fround;
const cache = new Map();
export function prepareGaussian(sigma) {
  sigma = f(sigma);
  if (!Number.isFinite(sigma) || sigma <= 0) throw new RangeError('Gaussian sigma must be finite and positive');
  if (cache.has(sigma)) return cache.get(sigma);
  const square = f(sigma * sigma), weights = [];
  let total = 1;
  for (let i = 1; i <= 12; i++) {
    const weight = f(Math.exp(f(f(f(-0.5 * i) * i) / square)));
    weights.push(weight);
    total = f(total + f(2 * weight));
  }
  const value = {weights0: weights.slice(0, 4), weights1: weights.slice(4, 8), weights2: weights.slice(8), total};
  if (cache.size === 8) cache.delete(cache.keys().next().value);
  cache.set(sigma, value);
  return value;
}
