import {
  MINIMUM_LIQUIDITY_THRESHOLD_ETH,
  FRAX_FXS_PAIR,
  FRAXSWAP_FRAX_WETH_PAIR,
  FRAX,
  NATIVE
} from "./packages/constants/index.template";
import { Pair, Token } from './types'
import {EthereumBlock} from "@subql/types-ethereum/dist/ethereum/interfaces";

import {FraxswapFactory__factory} from "./types/contracts";
import {BigNumber} from "ethers";

// No usage.
// export const uniswapFactoryContract =  FraxswapFactory__factory.connect("0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", api);
// export const factoryContract = FraxswapFactory__factory.connect(FACTORY_ADDRESS, api)

export async function getFxsPrice(): Promise<BigNumber> {
  const pair = await Pair.get(FRAX_FXS_PAIR);

  if (pair) {
    return BigNumber.from(pair.token0Price)
  }

  return BigNumber.from(0);
}

export async function getEthPrice(block?: EthereumBlock): Promise<BigNumber> {
  // Fetch eth prices for each stablecoin
  const fraxPair = await Pair.get(FRAXSWAP_FRAX_WETH_PAIR)
  
  // Can do a weighted average here later
  if (
    fraxPair &&
    fraxPair?.reserveETH &&
    BigNumber.from(fraxPair.reserveETH).gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)
  ) {
    const isFraxFirst = fraxPair.token0Id == FRAX
    const fraxPairEth = isFraxFirst ? fraxPair.reserve1 : fraxPair.reserve0
    const totalLiquidityETH = fraxPairEth;
    const fraxWeight = !isFraxFirst ? BigNumber.from(fraxPair.reserve0).div(totalLiquidityETH) : BigNumber.from(fraxPair.reserve1).div(totalLiquidityETH)
    const fraxPrice = isFraxFirst ? fraxPair.token0Price : fraxPair.token1Price

    return BigNumber.from(fraxPrice).mul(fraxWeight);
  }

  else {
    logger.warning('No eth pair...', [])
    return BigNumber.from(0);
  }
}

export async function findEthPerToken(token: Token): Promise<BigNumber> {
  if (token.id.toString() == NATIVE) {
    return BigNumber.from(1);
  }

  // const whitelist = token.whitelistPairsId

  // for  (let i = 0; i < whitelist.length; ++i) {
  //   const pairAddress = whitelist[i];
  //   const pair = await Pair.get(pairAddress);
  //   if (!pair) throw "Pair not found";
  //
  //   if (pair.token0Id == token.id && BigNumber.from(pair.reserveETH).gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
  //     const token1 = await Token.get(pair.token1Id)
  //     if (!token1) throw "token1 not found";
  //
  //     return BigNumber.from(pair.token1Price).mul(token1.derivedETH) // return token1 per our token * Eth per token 1
  //   }
  //
  //   if (pair.token1Id == token.id && BigNumber.from(pair.reserveETH).gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
  //     const token0 = await Token.get(pair.token0Id);
  //     if (!token0) throw "token0 not found";
  //     return BigNumber.from(pair.token0Price).mul(token0.derivedETH) // return token0 per our token * ETH per token 0
  //   }
  // }

  return BigNumber.from(0) // nothing was found return 0
}
