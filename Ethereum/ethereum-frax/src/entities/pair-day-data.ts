import { Pair, PairDayData } from '../types'
import { EthereumLog } from "@subql/types-ethereum";
import {BigNumber} from "ethers";

export async function updatePairDayData(event: EthereumLog): Promise<PairDayData> {
  const timestamp = BigNumber.from(event.block.timestamp).toBigInt();

  const day = BigNumber.from(timestamp).div(86400).toNumber();

  const date = BigNumber.from(day).mul(86400).toNumber();

  const id = event.address.toString().concat('-').concat(BigNumber.from(day).toString())

  const pair = await Pair.get(event.address.toString())
  if (!pair) throw "Pair is null";

  let pairDayData = await PairDayData.get(id);

  if (!pairDayData) {
    pairDayData = PairDayData.create({
      date: BigNumber.from(date).toNumber(),
      id: id,
      pairId: "",
      reserve0: 0,
      reserve1: 0,
      reserveUSD: 0,
      token0Id: "",
      token1Id: "",
      totalSupply: 0,
      twammReserve0: 0,
      twammReserve1: 0,
      txCount: 0n,
      volumeToken0: 0,
      volumeToken1: 0,
      volumeUSD: 0
    });

    pairDayData.token0Id = pair.token0Id;
    pairDayData.token1Id = pair.token1Id;
    pairDayData.pairId = pair.id;
    pairDayData.volumeToken0 = BigNumber.from(0).toNumber();
    pairDayData.volumeToken1 = BigNumber.from(0).toNumber();
    pairDayData.volumeUSD = BigNumber.from(0).toNumber();
    pairDayData.txCount = BigNumber.from(0).toBigInt();
  }

  pairDayData.totalSupply = pair.totalSupply
  pairDayData.reserve0 = pair.reserve0
  pairDayData.reserve1 = pair.reserve1
  pairDayData.twammReserve0 = pair.twammReserve0
  pairDayData.twammReserve1 = pair.twammReserve1
  pairDayData.reserveUSD = pair.reserveUSD
  pairDayData.txCount = BigNumber.from(pairDayData.txCount).add("1").toBigInt();
  await pairDayData.save()

  return pairDayData as PairDayData
}
