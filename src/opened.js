import { ABI } from './shared/abi.js';
import { makeProvider, makeContract } from './shared/provider.js';
import { logInfo, logErr } from './shared/logger.js';

const TAG = 'Opened';

async function main() {
  const provider = makeProvider();
  const contract = makeContract(provider, ABI.Opened);

  logInfo(TAG, 'listening…');

  contract.on(
    'Opened',
    (id, state, asset, longSide, lots, entryOrTargetX6, slX6, tpX6, liqX6, trader, leverageX, evt) => {
      const traderLc = String(trader).toLowerCase();
      logInfo(
        TAG,
        `id=${id} state=${state} asset=${asset} long=${longSide} lots=${lots} entryOrTargetX6=${entryOrTargetX6} slX6=${slX6} tpX6=${tpX6} liqX6=${liqX6} trader=${traderLc} lev=${leverageX}`,
        `@ block=${evt.blockNumber} tx=${evt.transactionHash} logIndex=${evt.logIndex}`
      );
    }
  );
}

main().catch((e) => {
  logErr(TAG, e);
  process.exit(1);
});
