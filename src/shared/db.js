import { supabase } from './supabase.js';
import { logInfo, logErr } from './logger.js';

// Cache mémoire simple pour assets
const assetCache = new Map();

/** Charge un asset (tick_size_usd6, lot_num, lot_den) depuis la DB (cache ensuite) */
export async function getAsset(asset_id) {
  if (assetCache.has(asset_id)) return assetCache.get(asset_id);
  const { data, error } = await supabase
    .from('assets')
    .select('asset_id, tick_size_usd6, lot_num, lot_den')
    .eq('asset_id', asset_id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Asset ${asset_id} introuvable dans DB (table assets)`);
  assetCache.set(asset_id, data);
  return data;
}

/** Helpers BigInt sûrs */
const BI = (x) => BigInt(x);
function divFloor(a, b) { return a / b; } // BigInt -> floor
function mulDivFloor(a, b, c) { return (a * b) / c; } // (a*b)/c en BigInt

/** Calcule notional & margin à partir de entry_x6, lots, leverage et lot ratio d'asset */
function computeNotionalAndMargin({ entry_x6, lots, leverage_x, lot_num, lot_den }) {
  const entry = BI(entry_x6);
  const lotsBI = BI(lots);
  const lotNum = BI(lot_num);
  const lotDen = BI(lot_den);
  const lev = BI(leverage_x);

  // qty_base = lots * (lot_num / lot_den)
  const qty_num = lotsBI * lotNum;  // numérateur
  const qty_den = lotDen;           // dénominateur

  // notional_usd6 = entry_x6 * qty_num / qty_den
  const notional = mulDivFloor(entry, qty_num, qty_den);
  const margin = divFloor(notional, lev);

  return { notional_usd6: notional.toString(), margin_usd6: margin.toString() };
}

/** Insère / met à jour positions quand on reçoit Opened */
export async function upsertOpenedEvent(ev) {
  const {
    id, state, asset, longSide, lots,
    entryOrTargetX6, slX6, tpX6, liqX6,
    trader, leverageX
  } = ev;

  const traderLc = String(trader).toLowerCase();
  const assetRow = await getAsset(Number(asset));

  let notional_usd6 = null;
  let margin_usd6 = null;

  // Si state=1 (OPEN/MARKET) on sait déjà entry → compute notional/margin
  if (Number(state) === 1) {
    const { notional_usd6: n6, margin_usd6: m6 } = computeNotionalAndMargin({
      entry_x6: entryOrTargetX6,
      lots,
      leverage_x: leverageX,
      lot_num: assetRow.lot_num,
      lot_den: assetRow.lot_den
    });
    notional_usd6 = n6;
    margin_usd6 = m6;
  }

  // UPSERT position
  const upsertPayload = {
    id: Number(id),
    state: Number(state),
    asset_id: Number(asset),
    trader_addr: String(trader),
    long_side: Boolean(longSide),
    lots: Number(lots),
    leverage_x: Number(leverageX),
    entry_x6: Number(state) === 1 ? String(entryOrTargetX6) : null,
    target_x6: Number(state) === 0 ? String(entryOrTargetX6) : null,
    sl_x6: String(slX6),
    tp_x6: String(tpX6),
    liq_x6: String(liqX6),
    notional_usd6,
    margin_usd6
  };

  const { error: upErr } = await supabase
    .from('positions')
    .upsert(upsertPayload, { onConflict: 'id' });
  if (upErr) throw upErr;

  // Si ORDER (state=0), indexer dans order_buckets
  if (Number(state) === 0) {
    const tick = BI(assetRow.tick_size_usd6);
    const price = BI(entryOrTargetX6);
    const bucket_id = divFloor(price, tick).toString();

    const { error: obErr } = await supabase
      .from('order_buckets')
      .insert({
        asset_id: Number(asset),
        bucket_id: bucket_id,
        position_id: Number(id)
      })
      .select()
      .maybeSingle();

    // ignore duplication (PK composite)
    if (obErr && obErr.code !== '23505') throw obErr;
  }

  logInfo('DB', `Opened upserted id=${id} state=${state} (indexed=${Number(state)===0})`);
}

/** Mise à jour quand on reçoit Executed: ORDER -> OPEN */
export async function handleExecutedEvent(ev) {
  const { id, entryX6 } = ev;

  // On lit la position pour récupérer lots, leverage, asset_id
  const { data: pos, error: readErr } = await supabase
    .from('positions')
    .select('asset_id, lots, leverage_x')
    .eq('id', Number(id))
    .maybeSingle();
  if (readErr) throw readErr;
  if (!pos) throw new Error(`Position ${id} introuvable pour Executed`);

  const assetRow = await getAsset(Number(pos.asset_id));

  const { notional_usd6, margin_usd6 } = computeNotionalAndMargin({
    entry_x6: entryX6,
    lots: pos.lots,
    leverage_x: pos.leverage_x,
    lot_num: assetRow.lot_num,
    lot_den: assetRow.lot_den
  });

  // 1) Update position -> OPEN
  const { error: upErr } = await supabase
    .from('positions')
    .update({
      state: 1,
      entry_x6: String(entryX6),
      notional_usd6,
      margin_usd6
    })
    .eq('id', Number(id));
  if (upErr) throw upErr;

  // 2) Retirer des order_buckets (au cas où plusieurs buckets => clean all by position_id)
  const { error: delErr } = await supabase
    .from('order_buckets')
    .delete()
    .eq('position_id', Number(id));
  if (delErr) throw delErr;

  logInfo('DB', `Executed applied id=${id} entryX6=${entryX6} (order_buckets cleaned)`);
}
