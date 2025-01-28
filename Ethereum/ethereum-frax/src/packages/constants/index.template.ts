import {BigNumber} from "ethers";

export const NULL_CALL_RESULT_VALUE = '0x0000000000000000000000000000000000000000000000000000000000000001'

export const ADDRESS_ZERO = ('0x0000000000000000000000000000000000000000')

export const BIG_DECIMAL_1E6 = BigNumber.from('1e6')

export const BIG_DECIMAL_1E12 = BigNumber.from('1e12')

export const BIG_DECIMAL_1E18 = BigNumber.from('1e18')

export const BIG_DECIMAL_ZERO = BigNumber.from('0');

export const BIG_DECIMAL_ONE = BigNumber.from('1');

export const BIG_INT_ONE = BigNumber.from('1');


export const BIG_INT_ZERO = BigNumber.from(0);


export const FACTORY_ADDRESS = (
  '{{ factory_address }}{{^factory_address}}0x0000000000000000000000000000000000000000{{/factory_address}}'
)

export const FXS_ADDRESS = (
  '{{ fxs_address }}{{^fxs_address}}0x0000000000000000000000000000000000000000{{/fxs_address}}'
)

export const BIG_FXS_START_PRICE = BigNumber.from(
  '{{ fxs_start_price }}{{^fxs_start_price}}8380000000000000000{{/fxs_start_price}}'
)

export const FRAX_FXS_PAIR_ADDRESS = (
  '{{ frax_fxs_pair_address }}{{^frax_fxs_pair_address}}0x0000000000000000000000000000000000000000{{/frax_fxs_pair_address}}'
)

export const FRAX_FXS_PAIR =
  '{{ frax_fxs_pair }}{{^frax_fxs_pair}}0x0000000000000000000000000000000000000000{{/frax_fxs_pair}}'

// minimum liquidity required to count towards tracked volume for pairs with small # of Lps
export const MINIMUM_USD_THRESHOLD_NEW_PAIRS = BigNumber.from(
  '{{ minimum_usd_threshold_new_pairs }}{{^minimum_usd_threshold_new_pairs}}3000{{/minimum_usd_threshold_new_pairs}}'
)

// minimum liquidity for price to get tracked
export const MINIMUM_LIQUIDITY_THRESHOLD_ETH = BigNumber.from(
  '{{ minimum_liquidity_threshold_eth }}{{^minimum_liquidity_threshold_eth}}1{{/minimum_liquidity_threshold_eth}}'
)

export const NATIVE = (
  '{{ native_address }}{{^native_address}}0x0000000000000000000000000000000000000000{{/native_address}}'
)

export const WETH_ADDRESS = (
  '{{ weth_address }}{{^weth_address}}0x0000000000000000000000000000000000000000{{/weth_address}}'
)

export const BIG_NATIVE_START_PRICE = BigNumber.from(
  '{{ native_start_price }}{{^native_start_price}}2143000000000000000000{{/native_start_price}}'
)


export const FRAXSWAP_FRAX_WETH_PAIR_ADDRESS = (
  '{{ fraxswap_frax_weth_pair_address }}{{^fraxswap_frax_weth_pair_address}}0x0000000000000000000000000000000000000000{{/fraxswap_frax_weth_pair_address}}'
)

export const FRAXSWAP_FRAX_WETH_PAIR = '{{ fraxswap_frax_weth_pair }}{{^fraxswap_frax_weth_pair}}0x0000000000000000000000000000000000000000{{/fraxswap_frax_weth_pair}}'

export const FRAXSWAP_FRAX_WETH_PAIR_DEPLOY_BLOCK = BigNumber.from(
  '{{ fraxswap_frax_weth_pair_deploy_block }}{{^fraxswap_frax_weth_pair_deploy_block}}14776073{{/fraxswap_frax_weth_pair_deploy_block}}'
)

export const STABLE_WNATIVE_PAIR =
  '{{ stable_wnative_pair }}{{^stable_wnative_pair}}0x0000000000000000000000000000000000000000{{/stable_wnative_pair}}'

export const STABLE_ADDRESS = (
  '{{ stable_address }}{{^stable_address}}0x0000000000000000000000000000000000000000{{/stable_address}}'
)

export const FRAX_ADDRESS = (
  '{{ frax_address }}{{^frax_address}}0x0000000000000000000000000000000000000000{{/frax_address}}'
)

export const FRAX = '{{ frax_address }}{{^frax_address}}0x0000000000000000000000000000000000000000{{/frax_address}}'


export const WHITELIST: string[] = '{{ whitelist }}'.split(',')

const CUSTOM_BASES = new Map<string, string>()
