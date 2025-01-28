import { Token, TokenDayData } from '../types'
import { EthereumLog } from "@subql/types-ethereum";
import {BigNumber} from "ethers";
import { getBundle } from '.'

export async function getTokenDayData(token: Token, event: EthereumLog): Promise<TokenDayData> {
  const bundle = await getBundle()

  const day = BigNumber.from(event.block.timestamp).div(86400).toNumber();

  const date = day * 86400

  const id = token.id.toString().concat('-').concat(BigNumber.from(day).toString())

  let tokenDayData = await TokenDayData.get(id);

  if (!tokenDayData) {
    tokenDayData = TokenDayData.create({
      date: date,
      id: id,
      liquidity: 0,
      liquidityETH: 0,
      liquidityUSD: 0,
      priceUSD: BigNumber.from(token.derivedETH).mul(bundle.ethPrice).toNumber(),
      tokenId: token.id,
      txCount: 0n,
      volume: 0,
      volumeETH: 0,
      volumeUSD: 0
    });
  }

  return tokenDayData as TokenDayData
}

export async function updateTokenDayData(token: Token, event: EthereumLog): Promise<TokenDayData> {
  const bundle = await getBundle()

  const tokenDayData = await getTokenDayData(token, event)

  tokenDayData.priceUSD = BigNumber.from(token.derivedETH).mul(bundle.ethPrice).toNumber();
  tokenDayData.liquidity = token.liquidity
  tokenDayData.liquidityETH = BigNumber.from(token.liquidity).mul(token.derivedETH).toNumber();
  tokenDayData.liquidityUSD = BigNumber.from(tokenDayData.liquidityETH).mul(bundle.ethPrice).toNumber();
  tokenDayData.txCount = BigNumber.from(tokenDayData.txCount).add('1').toBigInt();

  await tokenDayData.save()

  return tokenDayData as TokenDayData
}
