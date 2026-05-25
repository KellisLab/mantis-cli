export function findThreadByName(threads, name) {
  return threads.find((t) => t.name === name) ?? null;
}

export function defaultThreadName(base, threads) {
  if (!findThreadByName(threads, base)) return base;
  for (let n = 2; n < 100; n++) {
    const candidate = `${base} ${n}`;
    if (!findThreadByName(threads, candidate)) return candidate;
  }
  return `${base} ${Date.now()}`;
}
