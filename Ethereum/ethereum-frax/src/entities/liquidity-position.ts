import { LiquidityPosition, Pair } from '../types'
import {BigNumber} from "ethers";

// TODO: getLiquidityPosition
// export function getLiquidityPosition(id: string): LiquidityPosition {}

// TODO: getLiquidityPositions
// export function getLiquidityPositions(ids: string[]): LiquidityPosition[] {}

export async function createLiquidityPosition(user: String, pair: String, block: any): Promise<LiquidityPosition> {
  const pairAddress = pair.toString();

  const userAddress = user.toString();

  const id = pairAddress.concat('-').concat(userAddress)

  let liquidityPosition = await LiquidityPosition.get(id)

  if (!liquidityPosition) {
    // const pair = Pair.load(pairAddress)
    // const pair = getPair(Address.fromString(pairAddress), block)

    // TODO: We should do the inverse when a liquidity provider becomes inactive (removes all liquidity)
    // pair.liquidityProviderCount = pair.liquidityProviderCount.plus(BigInt.fromI32(1))
    // pair.save()
    // const pairContract = PairContract.bind(pair)
    // const liquidityTokenBalance = pairContract.balanceOf(user).divDecimal(BigDecimal.fromString('1e18'))

    const timestamp = BigNumber.from(block.timestamp).toNumber();

    liquidityPosition= LiquidityPosition.create({
      block: BigNumber.from(block.number).toNumber(),
      id: id,
      liquidityTokenBalance: 0,
      pairId: pairAddress,
      timestamp: timestamp,
      userId: userAddress
    });

    await liquidityPosition.save()
  }

  return liquidityPosition as LiquidityPosition
}
