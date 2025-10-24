import { ABI } from './shared/abi.js';
import { makeProvider, makeContract } from './shared/provider.js';
import { logInfo, logErr } from './shared/logger.js';

const TAG = 'Executed';

async function main() {
  const provider = makeProvider();
  const contract = makeContract(provider, ABI.Executed);

  logInfo(TAG, 'listening…');

  contract.on('Executed', (id, entryX6, evt) => {
    logInfo(
      TAG,
      `id=${id} entryX6=${entryX6}`,
      `@ block=${evt.blockNumber} tx=${evt.transactionHash} logIndex=${evt.logIndex}`
    );
  });
}

main().catch((e) => {
  logErr(TAG, e);
  process.exit(1);
});
