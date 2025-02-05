// Copyright 2020-2022 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BigNumber } from "@ethersproject/bignumber";
import { Factory__factory } from "../../types/contracts/factories/Factory__factory";

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
export const FACTORY_ADDRESS = "0x0bfbcf9fa4f9c56b0f40a671ad40e0805a091865";

export const ZERO_BI = BigInt(0);
export const ONE_BI = BigInt(1);
// export let ZERO_BD = 0
// export let ONE_BD = 1
// export let BI_18 = 18

// export let ZERO_BI = BigNumber.from('0')
// export let ONE_BI = BigNumber.from('1')
export const ZERO_BD = BigNumber.from("0");
export const ONE_BD = BigNumber.from("1");
export const BI_18 = BigNumber.from(18);

// export let ZERO_BI = BigInt.fromI32(0)
// export let ONE_BI = BigInt.fromI32(1)
// export let ZERO_BD = BigDecimal.fromString('0')
// export let ONE_BD = BigDecimal.fromString('1')
// export let BI_18 = BigInt.fromI32(18)

// export let factoryContract = FactoryContract.bind(Address.fromString(FACTORY_ADDRESS))
export const factoryContract = Factory__factory.connect(FACTORY_ADDRESS, api);
