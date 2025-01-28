import {
  BIG_INT_ZERO,
  MINIMUM_USD_THRESHOLD_NEW_PAIRS,
  WHITELIST
} from "../packages/constants/index.template";
import {BigNumber} from "ethers";
import { Burn, Mint, Pair, Swap, Token, Transaction } from '../types'

import {
  getBundle,
} from '../entities'

export const BLACKLIST_EXCHANGE_VOLUME: string[] = [
  '0x9ea3b5b4ec044b70375236a281986106457b20ef', // DELTA
]


/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export async function getTrackedLiquidityUSD(
    tokenAmount0: BigNumber|String,
    token0: Token,
    tokenAmount1: BigNumber|String,
    token1: Token
): Promise<String> {
  const bundle = await getBundle()

  const price0 = BigNumber.from(token0.derivedETH).mul(bundle.ethPrice);
  const price1 = BigNumber.from(token1.derivedETH).mul(bundle.ethPrice);

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return BigNumber.from(tokenAmount0).mul(price0).add(BigNumber.from(tokenAmount1).mul(price1)).toString();
  }

  // take double value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return BigNumber.from(tokenAmount0).mul(price0).mul("2").toString();
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return BigNumber.from(tokenAmount1).mul(price1).mul("2").toString();
  }

  // neither token is on white list, tracked volume is 0
  return BIG_INT_ZERO.toString()
}


/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD.
 * If both are, return average of two amounts
 * If neither is, return 0
 */
export async function getTrackedVolumeUSD(
    tokenAmount0: BigNumber | String,
    token0: Token,
    tokenAmount1: BigNumber | String,
    token1: Token,
    pair: Pair
): Promise<String> {
  const bundle = await getBundle()

  const price0 = BigNumber.from(token0.derivedETH).mul(bundle.ethPrice).toBigInt();
  const price1 = BigNumber.from(token1.derivedETH).mul(bundle.ethPrice).toBigInt();


  // if less than 5 LPs, require high minimum reserve amount amount or return 0
  if (BigNumber.from(pair.liquidityProviderCount).lt(BigNumber.from(5))) {


    const reserve0USD = BigNumber.from(pair.reserve0).mul(price0).toBigInt();
    const reserve1USD = BigNumber.from(pair.reserve1).mul(price1).toBigInt();

    if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {

      if (BigNumber.from(reserve0USD).add(reserve1USD).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return BigNumber.from(0).toString();
      }
    }
    if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {

      if (BigNumber.from(reserve0USD).mul('2').lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)){
        return BigNumber.from(0).toString();
      }
    }
    if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {

      if (BigNumber.from(reserve1USD).mul('2').lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return BigNumber.from(0).toString();
      }
    }
  }

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return (BigNumber.from(tokenAmount0).mul(price0)).add(BigNumber.from(tokenAmount1).mul(price1)).div("2").toString()
  }

  // take full value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return BigNumber.from(tokenAmount0).mul(price0).toString();
  }

  // take full value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return BigNumber.from(tokenAmount1).mul(price1).toString();
  }

  // neither token is on white list, tracked volume is 0
  return "0"
}


export function convertTokenToDecimal(tokenAmount: BigNumber, exchangeDecimals: BigInt): BigNumber {
  if (BigNumber.from(tokenAmount).eq("0")) {
    return BigNumber.from(tokenAmount);
  }

  return BigNumber.from(tokenAmount).div(BigNumber.from(exchangeDecimals));
}

export async function isCompleteMint(mintId: string): Promise<boolean> {
  const loaded_mint = await Mint.get(mintId);
  if (!loaded_mint) throw 'mint not found';
  return loaded_mint.sender != null
}


