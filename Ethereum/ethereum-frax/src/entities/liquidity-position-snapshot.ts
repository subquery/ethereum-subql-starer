import { LiquidityPosition, LiquidityPositionSnapshot, Pair, Token } from '../types'
import { getBundle, getPair, getToken } from '.'
import {BigNumber} from "ethers";
// import { EthereumLog } from "@subql/types-ethereum";
import {EthereumBlock} from "@subql/types-ethereum/dist/ethereum/interfaces";

export async function createLiquidityPositionSnapshot(position: LiquidityPosition, block: EthereumBlock): Promise<void> {
  const timestamp = BigNumber.from(block.timestamp).toNumber();

  const id = position.id.concat('-').concat(timestamp.toString())

  const bundle = await getBundle()


  let  pair = await getPair(position.pairId, block)
  if (!pair) throw "Pair is null";

  const token0 = await getToken(pair.token0Id)
  if (!token0) throw "token0 is null";

  const token1 = await getToken(pair.token1Id)
  if (!token1) throw "token1 is null";

  const snapshot = LiquidityPositionSnapshot.create({
    block: block.number,
    id: id,
    liquidityPositionId: position.id,
    liquidityTokenBalance: 0,
    liquidityTokenTotalSupply: 0,
    pairId: position.pairId,
    reserve0: 0,
    reserve1: 0,
    reserveUSD: 0,
    timestamp: timestamp,
    token0PriceUSD: 0,
    token1PriceUSD: 0,
    twammReserve0: 0,
    twammReserve1: 0,
    userId: position.userId
  });

  snapshot.token0PriceUSD = BigNumber.from(token0.derivedETH).mul(bundle.ethPrice).toNumber();
  snapshot.token1PriceUSD = BigNumber.from(token1.derivedETH).mul(bundle.ethPrice).toNumber();
  snapshot.reserve0 = pair.reserve0
  snapshot.reserve1 = pair.reserve1
  snapshot.twammReserve0 = pair.twammReserve0
  snapshot.twammReserve1 = pair.twammReserve1
  snapshot.reserveUSD = pair.reserveUSD
  snapshot.liquidityTokenTotalSupply = pair.totalSupply
  snapshot.liquidityTokenBalance = position.liquidityTokenBalance

  await snapshot.save();
}
