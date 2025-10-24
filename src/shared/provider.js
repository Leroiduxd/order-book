import 'dotenv/config';
import { ethers } from 'ethers';
import { logInfo } from './logger.js';

const WSS_URL = process.env.WSS_URL;
const CONTRACT_ADDR = (process.env.CONTRACT_ADDR || '').trim();

if (!WSS_URL) throw new Error('WSS_URL manquant dans .env');
if (!CONTRACT_ADDR) throw new Error('CONTRACT_ADDR manquant dans .env');

export function makeProvider() {
  // Ethers v6 WebSocketProvider (reconnect auto géré par ethers)
  const provider = new ethers.WebSocketProvider(WSS_URL);

  // Seul event supporté utile ici
  provider.on('network', (net, old) => {
    if (old) logInfo('WS', `reconnected to chainId=${net.chainId}`);
    else     logInfo('WS', `connected chainId=${net.chainId}`);
  });

  // Optionnel (verbeux) :
  // provider.on('debug', (info) => console.log('[WS][debug]', info));

  return provider;
}

export function makeContract(provider, abiFragment) {
  const iface = new ethers.Interface(abiFragment);
  return new ethers.Contract(CONTRACT_ADDR, iface, provider);
}
