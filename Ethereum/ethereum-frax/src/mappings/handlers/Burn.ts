import {BurnLog as BurnEvent} from "../../types/abi-interfaces/FraxswapPair";
import {Burn, Token, Transaction} from "../../types";
import {
    createLiquidityPosition,
    createLiquidityPositionSnapshot,
    getBundle,
    getFactory,
    getPair,
    getToken, updateDayData, updatePairDayData, updatePairHourData, updateTokenDayData
} from "../../entities";

import {convertTokenToDecimal} from "../fraxswap-pair";
import {BigNumber} from "ethers";

export async function onBurn(event: BurnEvent): Promise<void> {
    const transactionHash = event.transaction.hash.toString()
    let transaction = await Transaction.get(transactionHash);

    const pair = await getPair(event.address, event.block)
    if (!pair) throw "Pair is null";

    if (!transaction) {
        transaction = Transaction.create({
            blockNumber: 0n, id: transactionHash, timestamp: 0n
        });
        // transaction = new Transaction(transactionHash)
        transaction.blockNumber = BigNumber.from(event.block.number).toBigInt();
        transaction.timestamp = event.block.timestamp;
        await transaction.save();
    }

    let burns: any = [];
    let burn: Burn | undefined = undefined;

    // If transaction has burns
    if (burns.length) {
        burn = await Burn.get(burns[burns.length - 1]);
    }

    // If no burn or burn complete, create new burn
    if (!burn || burn.complete) {
        burn = Burn.create({
            complete: true,
            id: (event.transaction.hash.toString().concat('-').concat(BigNumber.from(burns.length).toString()).toString()),
            liquidity: 0,
            pairId: pair.id.toString(),
            timestamp: BigNumber.from(transaction.timestamp).toBigInt(),
            transactionId: transaction.id.toString()
        });
    }

    const factory = await getFactory()

    //update token info
    const token0 = await getToken(pair.token0Id);
    const token1 = await getToken(pair.token1Id);
    if (!token0) throw "token0 is null";
    if (!token1) throw "token1 is null";
    if (!event.args) throw "event.args is null";

    const token0Amount = convertTokenToDecimal(event.args.amount0, token0.decimals)
    const token1Amount = convertTokenToDecimal(event.args.amount1, token1.decimals)

    // update txn counts
    token0.txCount = BigNumber.from(token0.txCount).add("1").toBigInt();
    token1.txCount = BigNumber.from(token1.txCount).add("1").toBigInt();
    if (!token0) throw "token0 is null";
    if (!token1) throw "token1 is null";

    // get new amounts of USD and ETH for tracking
    const bundle = await getBundle()
    const amountTotalUSD = BigNumber.from(token1.derivedETH)
        .mul(token1Amount)
        .add(BigNumber.from(token0.derivedETH).mul(token0Amount))
        .mul(bundle.ethPrice)

    // update txn counts
    factory.txCount = BigNumber.from(factory.txCount).add('1').toBigInt();
    pair.txCount = BigNumber.from(factory.txCount).add('1').toBigInt();

    // update global counter and save
    await token0.save()
    await token1.save()
    await pair.save()
    await factory.save()

    // update burn
    // burn.sender = event.params.sender
    burn.amount0 = token0Amount.toNumber();
    burn.amount1 = token1Amount.toNumber();
    // burn.to = event.params.to
    burn.logIndex = BigNumber.from(event.logIndex).toBigInt();

    burn.amountUSD = amountTotalUSD.toNumber();
    await burn.save()

    // update the LP position
    const burnSender = burn.sender;
    if (burnSender)
    {
        const liquidityPosition = await createLiquidityPosition(burnSender, event.address, event.block)
        await createLiquidityPositionSnapshot(liquidityPosition, event.block)
    }

    // update day data
    await updateDayData(event)

    // update pair day data
    await updatePairDayData(event)

    // update pair hour data
    await updatePairHourData(event)

    // update token0 day data
    await updateTokenDayData(token0 as Token, event)

    // update token1 day data
    await updateTokenDayData(token1 as Token, event)
}