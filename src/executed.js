import { ABI } from './shared/abi.js';
import { makeProvider, makeContract } from './shared/provider.js';
import { EventCache, eventKey } from './shared/cache.js';
import { logInfo, logErr } from './shared/logger.js';

const TAG = 'Executed';
const cache = new EventCache();

async function main() {
  const provider = makeProvider();
  const contract = makeContract(provider, ABI.Executed);

  logInfo(TAG, 'listening…');

  contract.on('Executed', (id, entryX6, evt) => {
    const key = eventKey(evt);
    if (cache.seen(key)) return;

    logInfo(TAG,
      `id=${id} entryX6=${entryX6}`,
      `@ block=${evt.blockNumber} tx=${evt.transactionHash} logIndex=${evt.logIndex}`
    );
  });

  provider._websocket?.on('close', () => {
    logErr(TAG, 'WebSocket closed — exiting listener');
    process.exit(1);
  });
}

main().catch(e => {
  logErr(TAG, e);
  process.exit(1);
});
