import { ADDRESS_ZERO, BIG_DECIMAL_ZERO, BIG_INT_ZERO, FACTORY_ADDRESS, WHITELIST } from "../packages/constants/index.template";

import { Pair } from '../types'
import { FraxswapPair__factory } from '../types/contracts'
import { getToken } from '.'
import {EthereumBlock} from "@subql/types-ethereum/dist/ethereum/interfaces";
import {BigNumber} from "ethers";
import assert from "assert";

export async function getPair(
  address: String,
  block: EthereumBlock,
  token0FromParams: String = ADDRESS_ZERO,
  token1FromParams: String = ADDRESS_ZERO
): Promise<Pair | null> {

  let pair = await Pair.get(address.toString())

  if (!pair) {
    const pairContract = FraxswapPair__factory.connect(address.toString(),api)

    const token0Address = String(token0FromParams || await pairContract.token0());

    const token0 = await getToken(token0Address)

    if (token0 === null) {
      return null
    }

    const token1Address = String(token1FromParams || await pairContract.token1())
    const token1 = await getToken(token1Address)

    if (!token1) {
      return null
    }

    pair = Pair.create({
      block: 0n,
      factoryId: "",
      id: address.toString(),
      liquidityProviderCount: 0n,
      name: "",
      reserve0: 0,
      reserve1: 0,
      reserveETH: 0,
      reserveUSD: 0,
      timestamp: 0n,
      token0Id: "",
      token0Price: 0,
      token1Id: "",
      token1Price: 0,
      totalSupply: 0,
      trackedReserveETH: 0,
      twammReserve0: 0,
      twammReserve1: 0,
      txCount: 0n,
      untrackedVolumeUSD: 0,
      volumeToken0: 0,
      volumeToken1: 0,
      volumeUSD: 0
    });


    // if (WHITELIST.includes(token0.id)) {
    //   const newPairs = token1.whitelistPairsId
    //   newPairs.push(pair.id)
    //   token1.whitelistPairsId = newPairs
    // }
    // if (WHITELIST.includes(token1.id)) {
    //   const newPairs = token0.whitelistPairsId
    //   newPairs.push(pair.id)
    //   token0.whitelistPairsId = newPairs
    // }

    await token0.save()
    await token1.save()

    pair.factoryId = FACTORY_ADDRESS.toString()

    pair.name = token0.symbol.concat('-').concat(token1.symbol)

    pair.token0Id = token0.id
    pair.token1Id = token1.id
    pair.timestamp = block.timestamp
    pair.block = BigNumber.from(block.number).toBigInt()
  }

  return pair as Pair
}
