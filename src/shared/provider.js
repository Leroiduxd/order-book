import 'dotenv/config';
import { ethers } from 'ethers';
import { logInfo, logWarn, logErr } from './logger.js';

const WSS_URL = process.env.WSS_URL;
const CONTRACT_ADDR = (process.env.CONTRACT_ADDR || '').trim();

if (!WSS_URL) throw new Error('WSS_URL manquant dans .env');
if (!CONTRACT_ADDR) throw new Error('CONTRACT_ADDR manquant dans .env');

export function makeProvider() {
  // Ethers v6 WebSocketProvider
  const provider = new ethers.WebSocketProvider(WSS_URL);

  provider.on('error', (e) => logErr('WS', 'error', e?.message || e));
  provider.on('close', (code) => logWarn('WS', 'close', code));
  provider.on('network', (net, old) => {
    if (old) logInfo('WS', `reconnected to chainId=${net.chainId}`);
    else logInfo('WS', `connected chainId=${net.chainId}`);
  });

  return provider;
}

export function makeContract(provider, abiFragment) {
  // abiFragment: array d’un seul event (ou utiliser Interface)
  const iface = new ethers.Interface(abiFragment);
  const contract = new ethers.Contract(CONTRACT_ADDR, iface, provider);
  return contract;
}
