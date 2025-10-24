import { ABI } from './shared/abi.js';
import { makeProvider, makeContract } from './shared/provider.js';
import { logInfo, logErr } from './shared/logger.js';

const TAG = 'StopsUpdated';

async function main() {
  const provider = makeProvider();
  const contract = makeContract(provider, ABI.StopsUpdated);

  logInfo(TAG, 'listening…');

  contract.on('StopsUpdated', (id, slX6, tpX6, evt) => {
    logInfo(
      TAG,
      `id=${id} slX6=${slX6} tpX6=${tpX6}`,
      `@ block=${evt.blockNumber} tx=${evt.transactionHash} logIndex=${evt.logIndex}`
    );
  });
}

main().catch(e => {
  logErr(TAG, e);
  process.exit(1);
});
