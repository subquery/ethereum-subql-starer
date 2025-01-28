import {PairCreatedLog} from "../../types/abi-interfaces/FraxswapFactory";
import {getFactory, getPair} from "../../entities";
import {BigNumber} from "ethers";
import {BIG_INT_ONE} from "../../packages/constants/index.template";
import {FraxswapPair__factory} from "../../types/contracts";

export async function onPairCreated(log: PairCreatedLog): Promise<void> {
    const factory = await getFactory()


    if (!log.args) throw "event.args is null";
    const pair = await getPair(log.args.pair, log.block, log.args.token0, log.args.token1)

    // We returned null for some reason, we should silently bail without creating this pair
    if (!pair) {
        return
    }

    // Now it's safe to save
    await pair.save()

    // create the tracked contract based on the template
    // log.args.pair
    // const entity = Pair.create({
    //   block: 0n,
    //   factoryId: "",
    //   id: "",
    //   liquidityProviderCount: 0n,
    //   name: "",
    //   reserve0: 0,
    //   reserve1: 0,
    //   reserveETH: 0,
    //   reserveUSD: 0,
    //   timestamp: 0n,
    //   token0Id: "",
    //   token0Price: 0,
    //   token1Id: "",
    //   token1Price: 0,
    //   totalSupply: 0,
    //   trackedReserveETH: 0,
    //   twammReserve0: 0,
    //   twammReserve1: 0,
    //   txCount: 0n,
    //   untrackedVolumeUSD: 0,
    //   volumeToken0: 0,
    //   volumeToken1: 0,
    //   volumeUSD: 0
    // });


    // FraxswapPair__factory.connect(log.args.pair,api)


    // Update pair count once we've sucessesfully created a pair
    factory.pairCount = BigNumber.from(factory.pairCount).add(BIG_INT_ONE).toBigInt();
    await factory.save()
}