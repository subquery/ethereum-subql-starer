import { DayData, Factory } from '../types'
import {FACTORY_ADDRESS, BIG_DECIMAL_ZERO, BIG_INT_ZERO} from "../packages/constants/index.template";
import { EthereumLog } from "@subql/types-ethereum";
import {BigNumber} from "ethers";
export async function getFactory(id: String = FACTORY_ADDRESS): Promise<Factory> {
  let factory = await Factory.get(id.toString())

  if (!factory) {
    factory = Factory.create({
      id: "",
      liquidityETH: 0,
      liquidityUSD: 0,
      pairCount: 0n,
      tokenCount: 0n,
      txCount: 0n,
      untrackedVolumeUSD: 0,
      userCount: 0n,
      volumeETH: 0,
      volumeUSD: 0
    });
    await factory.save()
  }

  return factory as Factory
}

export async function getDayData(event: EthereumLog): Promise<DayData> {
  const id = BigNumber.from(event.block.timestamp).div('86400');

  let dayData = await DayData.get(id.toString())

  if (!dayData) {
    const factory = await getFactory();
    dayData = DayData.create({
      date: 0,
      factoryId: "",
      id: id.toString(),
      liquidityETH: 0,
      liquidityUSD: 0,
      txCount: 0n,
      untrackedVolume: 0,
      volumeETH: 0,
      volumeUSD: 0

    })
    dayData.factoryId = factory.id
    dayData.date = BigNumber.from(id).mul(86400).toNumber();
    dayData.volumeUSD = BIG_DECIMAL_ZERO.toNumber();
    dayData.volumeETH = BIG_DECIMAL_ZERO.toNumber();
    dayData.untrackedVolume = BIG_DECIMAL_ZERO.toNumber();
    dayData.liquidityUSD = factory.liquidityUSD
    dayData.liquidityETH = factory.liquidityETH
    dayData.txCount = factory.txCount
  }

  return dayData as DayData
}

export async function updateDayData(event: EthereumLog): Promise<DayData> {
  const factory = await getFactory()

  const dayData = await getDayData(event)

  dayData.liquidityUSD = factory.liquidityUSD
  dayData.liquidityETH = factory.liquidityETH
  dayData.txCount = factory.txCount

  await dayData.save()

  return dayData as DayData
}
