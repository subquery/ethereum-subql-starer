import { Pair, PairHourData } from '../types'
import { EthereumLog } from "@subql/types-ethereum";
import {BigNumber} from "ethers";
export async function updatePairHourData(event: EthereumLog): Promise<PairHourData> {
  const timestamp = BigNumber.from(event.block.timestamp).toBigInt();

  const hour = BigNumber.from(timestamp).div(3600).toNumber();

  const date = BigNumber.from(hour).mul(3600).toNumber();

  const id = event.address.toString().concat('-').concat(BigNumber.from(hour).toString());

  const pair = await Pair.get(event.address.toString())
  if (!pair) throw "Pair is null";

  let pairHourData = await PairHourData.get(id);

  if (!pairHourData) {
    pairHourData = PairHourData.create({
      date: BigNumber.from(date).toNumber(),
      id: id,
      pairId: pair.id,
      reserve0: 0,
      reserve1: 0,
      reserveUSD: 0,
      twammReserve0: 0,
      twammReserve1: 0,
      txCount: 0n,
      volumeToken0: 0,
      volumeToken1: 0,
      volumeUSD: 0
    });
    pairHourData.volumeToken0 = BigNumber.from(0).toNumber();
    pairHourData.volumeToken1 = BigNumber.from(0).toNumber();
    pairHourData.volumeUSD = BigNumber.from(0).toNumber();
    pairHourData.txCount = BigNumber.from(0).toBigInt();
  }

  pairHourData.reserve0 = pair.reserve0
  pairHourData.reserve1 = pair.reserve1
  pairHourData.twammReserve0 = pair.twammReserve0
  pairHourData.twammReserve1 = pair.twammReserve1
  pairHourData.reserveUSD = pair.reserveUSD
  pairHourData.txCount = BigNumber.from(pairHourData.txCount).add(1).toBigInt();

  await pairHourData.save()

  return pairHourData as PairHourData
}
