import { ABI } from './shared/abi.js';
import { makeProvider, makeContract } from './shared/provider.js';
import { logInfo, logErr } from './shared/logger.js';

const TAG = 'Removed';

async function main() {
  const provider = makeProvider();
  const contract = makeContract(provider, ABI.Removed);

  logInfo(TAG, 'listening…');

  contract.on('Removed', (id, reason, execX6, pnlUsd6, evt) => {
    logInfo(
      TAG,
      `id=${id} reason=${reason} execX6=${execX6} pnlUsd6=${pnlUsd6}`,
      `@ block=${evt.blockNumber} tx=${evt.transactionHash} logIndex=${evt.logIndex}`
    );
  });
}

main().catch(e => {
  logErr(TAG, e);
  process.exit(1);
});
