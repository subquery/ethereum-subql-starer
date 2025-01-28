import {SyncLog as SyncEvent} from "../../types/abi-interfaces/FraxswapPair";
import {getBundle, getFactory, getPair, getToken} from "../../entities";
import {BIG_DECIMAL_ZERO} from "../../packages/constants/index.template";
import {findEthPerToken, getEthPrice} from "../../pricing";
import {Token} from "../../types";
import {convertTokenToDecimal, getTrackedLiquidityUSD} from "../fraxswap-pair";
import {BigNumber} from "ethers";
import {FraxswapPair__factory} from "../../types/contracts"
export async function onSync(event: SyncEvent): Promise<void> {
    const pair = await getPair(event.address, event.block)
    if (!pair) throw "Pair is null";

    const token0 = await getToken(pair.token0Id)
    const token1 = await getToken(pair.token1Id)
    if (!token0) throw "token0 is null";
    if (!token1) throw "token1 is null";

    const factory = await getFactory()

    // reset factory liquidity by subtracting only tracked liquidity
    factory.liquidityETH = BigNumber.from(factory.liquidityETH).sub(pair.trackedReserveETH).toNumber();

    // reset token total liquidity amounts
    token0.liquidity = BigNumber.from(token0.liquidity).sub(pair.reserve0).toNumber();
    token1.liquidity = BigNumber.from(token1.liquidity).sub(pair.reserve1).toNumber();

    // Fetch reserves, accounting for outstanding TWAMMs
    const pair_contract = FraxswapPair__factory.connect(event.address, api);

    const reserves_true = await pair_contract.getReserveAfterTwamm(event.block.timestamp)
    const reserve0_true = reserves_true._reserve0;
    const reserve1_true = reserves_true._reserve1;


    // Set to the true reserve values, accounting for outstanding TWAMMs
    pair.reserve0 = convertTokenToDecimal(reserve0_true, token0.decimals).toNumber();
    pair.reserve1 = convertTokenToDecimal(reserve1_true, token1.decimals).toNumber();
    pair.twammReserve0 = convertTokenToDecimal(reserves_true._twammReserve0, token0.decimals).toNumber();
    pair.twammReserve1 = convertTokenToDecimal(reserves_true._twammReserve1, token1.decimals).toNumber();

    if (!BigNumber.from(pair.reserve1).eq("0")) {
        pair.token0Price = BigNumber.from(pair.reserve0).div(pair.reserve1).toNumber();
    } else {
        pair.token0Price = BigNumber.from(0).toNumber();
    }

    if (!BigNumber.from(pair.reserve0).eq("0")) {
        pair.token1Price = BigNumber.from(pair.reserve1).div(pair.reserve0).toNumber();
    } else {
        pair.token1Price = BigNumber.from(0).toNumber();
    }

    await pair.save()

    // update ETH price now that reserves could have changed
    const bundle = await getBundle()
    // Pass the block so we can get accurate price data before migration
    bundle.ethPrice = (await getEthPrice(event.block)).toNumber();
    await bundle.save();

    token0.derivedETH = (await findEthPerToken(token0 as Token)).toNumber();
    token1.derivedETH = (await findEthPerToken(token1 as Token)).toNumber();
    await token0.save()
    await token1.save()

    // get tracked liquidity - will be 0 if neither is in whitelist
    let trackedLiquidityETH: BigNumber;
    if (!BigNumber.from(bundle.ethPrice).eq("0")) {
        trackedLiquidityETH = BigNumber.from(await getTrackedLiquidityUSD(pair.reserve0.toString(), token0 as Token, pair.reserve1.toString(), token1 as Token)).div(
            bundle.ethPrice
        )
    } else {
        trackedLiquidityETH = BigNumber.from(0);
    }

    // use derived amounts within pair
    pair.trackedReserveETH = trackedLiquidityETH.toNumber();
    pair.reserveETH = BigNumber.from(pair.reserve0)
        .mul(token0.derivedETH)
        .add(BigNumber.from(pair.reserve1).mul(token1.derivedETH)).toNumber();

    pair.reserveUSD = BigNumber.from(pair.reserveETH).mul(bundle.ethPrice).toNumber();

    // use tracked amounts globally
    factory.liquidityETH = BigNumber.from(factory.liquidityETH).add(trackedLiquidityETH).toNumber();
    factory.liquidityUSD = BigNumber.from(factory.liquidityETH).mul(bundle.ethPrice).toNumber();

    // now correctly set liquidity amounts for each token
    token0.liquidity = BigNumber.from(token0.liquidity).add(pair.reserve0).toNumber();
    token1.liquidity = BigNumber.from(token1.liquidity).add(pair.reserve1).toNumber();

    // save entities
    await pair.save()
    await factory.save()
    await token0.save()
    await token1.save()
}