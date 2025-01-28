import {MintLog as MintEvent} from "../../types/abi-interfaces/FraxswapPair";
import {Mint, Token, Transaction} from "../../types";
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

export async function onMint(event: MintEvent): Promise<void> {
    const transaction = await Transaction.get(event.transaction.hash.toString())
    if (!transaction) throw "transaction is null";

    const mints: any = [];

    if (!mints) {
        logger.info('Mints history null onMint event', [])
        return
    }

    const mint = await Mint.get(mints[mints.length - 1])
    if (!mint) throw "mint is null";

    const pair = await getPair(event.address, event.block)
    if (!pair) throw "Pair is null";

    const factory = await getFactory()

    const token0 = await getToken(pair.token0Id);
    const token1 = await getToken(pair.token1Id);
    if (!token0) throw "token0 is null";
    if (!token1) throw "token1 is null";
    if (!event.args) throw "event.args is null";

    // update exchange info (except balances, sync will cover that)
    const token0Amount = convertTokenToDecimal(event.args.amount0, token0.decimals)
    const token1Amount = convertTokenToDecimal(event.args.amount1, token1.decimals)

    // update tx counts
    token0.txCount = BigNumber.from(token0.txCount).add(1).toBigInt();
    token1.txCount = BigNumber.from(token1.txCount).add(1).toBigInt();

    // get new amounts of USD and ETH for tracking
    const bundle = await getBundle()
    const amountTotalUSD = BigNumber.from(token1.derivedETH)
        .mul(token1Amount)
        .add(BigNumber.from(token0.derivedETH).mul(token0Amount))
        .mul(bundle.ethPrice).toNumber();

    // update txn counts
    pair.txCount = BigNumber.from(pair.txCount).add('1').toBigInt();

    factory.txCount = BigNumber.from(factory.txCount).add('1').toBigInt();

    // save entities
    await token0.save();
    await token1.save();
    await pair.save();
    await factory.save();

    mint.sender = event.args.sender
    mint.amount0 = token0Amount.toNumber();
    mint.amount1 = token1Amount.toNumber();
    mint.logIndex = BigNumber.from(event.logIndex).toBigInt();
    mint.amountUSD = amountTotalUSD;
    await mint.save()


    // create liquidity position
    const liquidityPosition = await createLiquidityPosition(mint.to, event.address, event.block)

    // create liquidity position snapshot
    await createLiquidityPositionSnapshot(liquidityPosition, event.block)

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