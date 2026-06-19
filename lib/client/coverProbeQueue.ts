/**
 * Limits concurrent cover image probes so home grids do not stampede the network.
 * Location: lib/client/coverProbeQueue.ts
 */

const MAX_CONCURRENT = 4;
let active = 0;
const waitQueue: Array<() => void> = [];

function releaseSlot(): void {
  active = Math.max(0, active - 1);
  const next = waitQueue.shift();
  if (next) next();
}

export function withCoverProbeSlot<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      active += 1;
      void task()
        .then(resolve, reject)
        .finally(releaseSlot);
    };
    if (active < MAX_CONCURRENT) {
      run();
    } else {
      waitQueue.push(run);
    }
  });
}
