import {SwapLog as SwapEvent} from "../../types/abi-interfaces/FraxswapPair";
import {
    getBundle,
    getFactory,
    getPair,
    getToken,
    updateDayData,
    updatePairDayData,
    updatePairHourData, updateTokenDayData
} from "../../entities";
import {Pair, Swap, Token, Transaction} from "../../types";
import {BIG_DECIMAL_ZERO} from "../../packages/constants/index.template";
import {convertTokenToDecimal, getTrackedVolumeUSD} from "../fraxswap-pair";
import {BigNumber} from "ethers";
import {BLACKLIST_EXCHANGE_VOLUME} from "../fraxswap-pair";

export async function onSwap(event: SwapEvent): Promise<void> {
    logger.info('onSwap', [])
    const pair = await getPair(event.address, event.block)
    if (!pair) throw "Pair is null";
    const token0 = await getToken(pair.token0Id);
    const token1 = await getToken(pair.token1Id);
    if (!token0) throw "token0 is null";
    if (!token1) throw "token1 is null";
    if (!event.args) throw "event.args is null";

    const amount0In = convertTokenToDecimal(event.args.amount0In, token0.decimals)
    const amount1In = convertTokenToDecimal(event.args.amount1In, token1.decimals)
    const amount0Out = convertTokenToDecimal(event.args.amount0Out, token0.decimals)
    const amount1Out = convertTokenToDecimal(event.args.amount1Out, token1.decimals)

    // totals for volume updates
    const amount0Total = amount0Out.add(amount0In)
    const amount1Total = amount1Out.add(amount1In)

    // ETH/USD prices
    const bundle = await getBundle()

    // get total amounts of derived USD and ETH for tracking
    const derivedAmountETH = BigNumber.from(token1.derivedETH)
        .mul(amount1Total)
        .add(BigNumber.from(token0.derivedETH).mul(amount0Total))
        .div(BigNumber.from('2'));

    const derivedAmountUSD = BigNumber.from(derivedAmountETH).mul(bundle.ethPrice);

    // only accounts for volume through white listed tokens
    const trackedAmountUSD = await getTrackedVolumeUSD(
        amount0Total,
        token0 as Token,
        amount1Total,
        token1 as Token,
        pair as Pair
    )

    let trackedAmountETH: BigNumber;

    if (BigNumber.from(bundle.ethPrice).eq(BIG_DECIMAL_ZERO)) {
        trackedAmountETH = BigNumber.from(0);
    } else {
        trackedAmountETH = BigNumber.from(trackedAmountUSD).div(bundle.ethPrice)
    }

    // update token0 global volume and token liquidity stats
    token0.volume = BigNumber.from(token0.volume).add(BigNumber.from(amount0In).add(amount0Out)).toNumber();
    token0.volumeUSD = BigNumber.from(token0.volumeUSD).add(BigNumber.from(trackedAmountUSD)).toNumber();
    token0.untrackedVolumeUSD = BigNumber.from(token0.untrackedVolumeUSD).add(derivedAmountUSD).toNumber();

    // update token1 global volume and token liquidity stats
    token1.volume = BigNumber.from(token1.volume).add(BigNumber.from(amount1In).add(amount1Out)).toNumber();
    token1.volumeUSD = BigNumber.from(token1.volumeUSD).add(BigNumber.from(trackedAmountUSD)).toNumber();
    token1.untrackedVolumeUSD = BigNumber.from(token1.untrackedVolumeUSD).add(derivedAmountUSD).toNumber();

    // update txn counts
    token0.txCount = BigNumber.from(token0.txCount).add("1").toBigInt();
    token1.txCount = BigNumber.from(token1.txCount).add("1").toBigInt();

    // update pair volume data, use tracked amount if we have it as its probably more accurate
    pair.volumeUSD = BigNumber.from(pair.volumeUSD).add(BigNumber.from(trackedAmountUSD)).toNumber();
    pair.volumeToken0 = BigNumber.from(pair.volumeToken0).add(amount0Total).toNumber();
    pair.volumeToken1 = BigNumber.from(pair.volumeToken1).add(amount1Total).toNumber();
    pair.untrackedVolumeUSD = BigNumber.from(pair.untrackedVolumeUSD).add(derivedAmountUSD).toNumber();
    pair.txCount = BigNumber.from(pair.txCount).add("1").toBigInt();
    await pair.save()

    // Don't track volume for these tokens in total exchange volume
    if (!BLACKLIST_EXCHANGE_VOLUME.includes(token0.id) && !BLACKLIST_EXCHANGE_VOLUME.includes(token1.id)) {
        // update global values, only used tracked amounts for volume
        const factory = await getFactory()
        factory.volumeUSD = BigNumber.from(factory.volumeUSD).add(BigNumber.from(trackedAmountUSD)).toNumber();
        factory.volumeETH = BigNumber.from(factory.volumeETH).add(BigNumber.from(trackedAmountETH)).toNumber();
        factory.untrackedVolumeUSD = BigNumber.from(factory.untrackedVolumeUSD).add(derivedAmountUSD).toNumber();
        factory.txCount = BigNumber.from(factory.txCount).add(1).toBigInt();
        await factory.save()
    }

    // save entities
    await pair.save()
    await token0.save()
    await token1.save()

    let transaction = await Transaction.get(event.transaction.hash.toString());

    if (!transaction) {
        transaction = Transaction.create({
            blockNumber: BigNumber.from(event.block.number).toBigInt(),
            id: event.transaction.hash.toString(),
            timestamp: event.block.timestamp
        });
    }
    let swaps: any = [];
    if (!swaps) swaps = []

    const swap = Swap.create({
        amount0In: 0,
        amount0Out: 0,
        amount1In: 0,
        amount1Out: 0,
        amountUSD: 0,
        id: event.transaction.hash.toString().concat('-').concat(BigNumber.from(swaps.length).toString()),
        pairId: "",
        sender: "",
        timestamp: 0n,
        to: "",
        transactionId: ""
    });

    // update swap event
    swap.pairId = pair.id
    swap.timestamp = transaction.timestamp
    swap.transactionId = transaction.id
    swap.sender = event.args.sender
    swap.amount0In = amount0In.toNumber();
    swap.amount1In = amount1In.toNumber();
    swap.amount0Out = amount0Out.toNumber();
    swap.amount1Out = amount1Out.toNumber();
    swap.to = event.args.to
    swap.logIndex = BigNumber.from(event.logIndex).toBigInt();
    // use the tracked amount if we have it
    swap.amountUSD = BigNumber.from((BigNumber.from(trackedAmountUSD).eq("0") ? derivedAmountUSD : trackedAmountUSD)).toNumber();
    await swap.save()

    // update the transaction
    // transaction.swapsId = swaps.concat([swap.id]);

    await transaction.save()

    const dayData = await updateDayData(event)

    const pairDayData = await updatePairDayData(event)
    const pairHourData = await updatePairHourData(event)

    const token0DayData = await updateTokenDayData(token0 as Token, event)
    const token1DayData = await updateTokenDayData(token1 as Token, event)

    // Don't track volume for these tokens in total exchange volume
    if (!BLACKLIST_EXCHANGE_VOLUME.includes(token0.id) && !BLACKLIST_EXCHANGE_VOLUME.includes(token1.id)) {
        // swap specific updating
        dayData.volumeUSD = BigNumber.from(dayData.volumeUSD).add(BigNumber.from(trackedAmountUSD)).toNumber();
        dayData.volumeETH = BigNumber.from(dayData.volumeETH).add(BigNumber.from(trackedAmountETH)).toNumber();
        dayData.untrackedVolume = BigNumber.from(dayData.untrackedVolume).add(derivedAmountUSD).toNumber();
        await dayData.save()
    }

    // swap specific updating for pair
    pairDayData.volumeToken0 = BigNumber.from(pairDayData.volumeToken0).add(amount0Total).toNumber()
    pairDayData.volumeToken1 = BigNumber.from(pairDayData.volumeToken1).add(amount1Total).toNumber();
    pairDayData.volumeUSD = BigNumber.from(pairDayData.volumeUSD).add(BigNumber.from(trackedAmountUSD)).toNumber();
    await pairDayData.save()

    // update hourly pair data

    pairHourData.volumeToken0 = BigNumber.from(pairHourData).add(amount0Total).toNumber();
    pairHourData.volumeToken1 = BigNumber.from(pairHourData.volumeToken1).add(amount1Total).toNumber();
    pairHourData.volumeUSD = BigNumber.from(pairHourData.volumeUSD).add(BigNumber.from(trackedAmountUSD)).toNumber();
    await pairHourData.save()

    // swap specific updating for token0
    token0DayData.volume = BigNumber.from(token0DayData.volume).add(amount0Total).toNumber();
    token0DayData.volumeETH = BigNumber.from(token0DayData.volumeETH).add(BigNumber.from(amount0Total).mul(token1.derivedETH)).toNumber();
    token0DayData.volumeUSD = BigNumber.from(token0DayData.volumeUSD).add(
        BigNumber.from(amount0Total).mul(token0.derivedETH).mul(bundle.ethPrice)
    ).toNumber();
    await token0DayData.save()

    // swap specific updating
    token1DayData.volume = BigNumber.from(token1DayData.volume).add(amount1Total).toNumber();
    token1DayData.volumeETH = BigNumber.from(token1DayData.volumeETH).add(amount1Total.mul(token1.derivedETH)).toNumber();
    token1DayData.volumeUSD = BigNumber.from(token1DayData.volumeUSD).add(
        BigNumber.from(amount1Total).mul(token1.derivedETH).mul(bundle.ethPrice)
    ).toNumber();

    await token1DayData.save()
}
