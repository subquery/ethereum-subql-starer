import {TransferLog as TransferEvent} from "../../types/abi-interfaces/FraxswapPair";
import {ADDRESS_ZERO} from "../../packages/constants/index.template";
import {createLiquidityPosition, createLiquidityPositionSnapshot, getFactory, getUser} from "../../entities";
import {Burn, Mint, Pair, Transaction} from "../../types";
import {BigNumber} from "ethers";
import {isCompleteMint} from "../fraxswap-pair";
export async function onTransfer(event: TransferEvent): Promise<void> {
    if (!event.args) throw "event.args is null";
    // ignore initial transfers for first adds
    if (event.args.to == ADDRESS_ZERO && BigNumber.from(event.args.value).eq("1000")) {
        return
    }


    const factory = await getFactory()
    const transactionHash = event.transaction.hash;

    // Force creation of users if not already known will be lazily created
    await getUser(event.args.from)
    await getUser(event.args.to)

    const pair = await Pair.get(event.address)
    if (!pair) throw "Pair is null";

    // liquidity token amount being transfered
    const value = BigNumber.from(event.args.value).div(BigNumber.from('1e18'));

    let transaction = await Transaction.get(transactionHash)

    if (!transaction) {
        transaction = Transaction.create({
            blockNumber: BigNumber.from(event.block.number).toBigInt(),
            id: transactionHash.toString(),
            timestamp: BigNumber.from(event.block.timestamp).toBigInt()
        });
    }

    let mints: any = [];
    let burns: any = [];

    // 3 cases, mints, send first on ETH withdrawls, and burns

    if (event.args.from == ADDRESS_ZERO) {
        // mints

        // update total supply
        pair.totalSupply = BigNumber.from(pair.totalSupply).add(value).toNumber();
        await pair.save()

        // If transaction has no mints or last mint is complete
        if (mints.length == 0 || (await isCompleteMint(mints[mints.length - 1]))) {
            // log.warning('1-1: NO MINTS OR LAST MINT IS COMPLETE', [])
            const mint = Mint.create({
                amount0: 0,
                amount1: 0,
                amountUSD: 0,
                feeLiquidity: 0,
                feeTo: "",
                id: event.transaction.hash.concat('-').concat(BigNumber.from(mints.length).toString()),
                liquidity: value.toNumber(),
                logIndex: 0n,
                pairId: pair.id,
                sender: "",
                timestamp: BigNumber.from(transaction.timestamp).toBigInt(),
                to: event.args.to,
                transactionId: transaction.id.toString()
            });

            await mint.save();

            // transaction.mintsId = mints.concat([mint.id]);

            // save entities
            await transaction.save();
            await factory.save();
        }
    } else if (event.args.to == pair.id) {
        // case where direct send first on ETH withdrawls
        const burn = Burn.create({
            amount0: 0,
            amount1: 0,
            amountUSD: 0,
            complete: false,
            feeLiquidity: 0,
            feeTo: "",
            id: event.transaction.hash.concat('-').concat(BigNumber.from(mints.length).toString()),
            liquidity: value.toNumber(),
            logIndex: 0n,
            pairId: pair.id,
            sender: event.args.from,
            timestamp: BigNumber.from(transaction.timestamp).toBigInt(),
            to: event.args.to,
            transactionId: transaction.id
        });

        await burn.save()

        // transaction.burnsId = burns.concat([burn.id])

        await transaction.save()
    } else if (event.args.to == ADDRESS_ZERO && event.args.from == pair.id) {
        // burns
        pair.totalSupply = BigNumber.from(pair.totalSupply).mod(value).toNumber();
        await pair.save();

        let burn: Burn | undefined = undefined

        // If transaction has burns
        if (burns.length) {
            burn = await Burn.get(burns[burns.length - 1])
        }

        // If no burn or burn complete, create new burn
        if (burn === undefined || burn.complete) {
            burn = Burn.create({
                amount0: 0,
                amount1: 0,
                amountUSD: 0,
                complete: true,
                feeLiquidity: 0,
                feeTo: "",
                id: event.transaction.hash.concat('-').concat(BigNumber.from(mints.length).toString()),
                liquidity: value.toNumber(),
                logIndex: 0n,
                pairId: pair.id,
                sender: "",
                timestamp: BigNumber.from(transaction.timestamp).toBigInt(),
                to: "",
                transactionId: transaction.id
            });
        }

        // if this logical burn included a fee mint, account for this
        if (mints.length != 0 && !(await isCompleteMint(mints[mints.length - 1]))) {
            const mint = await Mint.get(mints[mints.length - 1])
            if (!mint) throw "mint is null";

            burn.feeTo = mint.to
            burn.feeLiquidity = mint.liquidity

            // remove the logical mint
            // store.remove('Mint', mints[mints.length - 1])

            // update the transaction
            // transaction.mintsId = mints.slice(0, -1)
            await transaction.save()
        }

        await burn.save()

        if (!burn.complete) {
            // Burn is not complete, replace previous tail
            // transaction.burnsId = burns.slice(0, -1).concat([burn.id])
        } else {
            // Burn is complete, concat to transactions
            // transaction.burnsId = burns.concat([burn.id])
        }

        await transaction.save()
    }


    // BURN
    if (event.args.from != ADDRESS_ZERO && event.args.from != pair.id) {
        const fromUserLiquidityPosition = await createLiquidityPosition(event.args.from, event.address, event.block)

        fromUserLiquidityPosition.liquidityTokenBalance = BigNumber.from(fromUserLiquidityPosition.liquidityTokenBalance).sub(value).toNumber();

        await fromUserLiquidityPosition.save()

        await createLiquidityPositionSnapshot(fromUserLiquidityPosition, event.block)
    }

    // MINT
    if (event.args.to != ADDRESS_ZERO && event.args.to.toString() != pair.id) {

        const toUserLiquidityPosition = await createLiquidityPosition(event.args.to, event.address, event.block)

        toUserLiquidityPosition.liquidityTokenBalance = BigNumber.from(toUserLiquidityPosition.liquidityTokenBalance).add(value).toNumber();

        await toUserLiquidityPosition.save()

        await createLiquidityPositionSnapshot(toUserLiquidityPosition, event.block)
    }

    await transaction.save()
}
