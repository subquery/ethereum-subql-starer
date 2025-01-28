import { BIG_DECIMAL_ZERO, BIG_INT_ZERO, NULL_CALL_RESULT_VALUE } from "../packages/constants/index.template";


import { ERC20__factory } from '../types/contracts';
import { ERC20NameBytes__factory } from '../types/contracts'
import { ERC20SymbolBytes__factory } from '../types/contracts'
import { Token } from '../types'
import { getFactory } from './factory'
import {BigNumber} from "ethers";

export async function getToken(address: String): Promise<Token | null> {
  let token = await Token.get(address.toString())

  if (!token) {
    const factory = await getFactory();

    factory.tokenCount = BigNumber.from(factory.tokenCount).add("1").toBigInt()
    await factory.save()

    token= Token.create({
      decimals: 0n,
      derivedETH: 0,
      factoryId: factory.id.toString(),
      id: address.toString(),
      liquidity: 0,
      name: "",
      symbol: await getSymbol(address),
      totalSupply: 0n,
      txCount: 0n,
      untrackedVolumeUSD: 0,
      volume: 0,
      volumeUSD: 0
    });



    token.symbol = await getSymbol(address);
    token.name = await getName(address);
    token.totalSupply = (await getTotalSupply(address)).toBigInt();
    const decimals = await getDecimals(address);

    // TODO: Does this ever happen?
    if (!decimals) {
      logger.warning('Decimals for token {} was null', [address.toString()])
      return null
    }

    // token.whitelistPairsId = [];
    token.decimals = decimals.toBigInt();

    await token.save();
  }

  return token as Token
}

export async function getSymbol(tokenAddress: String): Promise<string> {
  // hard coded override
  if (tokenAddress.toString() == '0xe0b7927c4af23765cb51314a0e0521a9645f0e2a') {
    return 'DGD'
  }
  if (tokenAddress.toString() == '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9') {
    return 'AAVE'
  }
  if (tokenAddress.toString() == '0x5dbcf33d8c2e976c6b560249878e6f1491bca25c') {
    return 'yUSD'
  }
  if (tokenAddress.toString() == '0x0309c98b1bffa350bcb3f9fb9780970ca32a5060') {
    return 'BDI'
  }
  if (tokenAddress.toString() == '0x3fa729b4548becbad4eab6ef18413470e6d5324c') {
    return 'MOVE'
  }
  if (tokenAddress.toString() == '0xe95a203b1a91a908f9b9ce46459d101078c2c3cb') {
    return 'aETHc'
  }

  // CELO hardcode
  if (tokenAddress.toString() == '0x471ece3750da237f93b8e339c536989b8978a438') {
    return 'CELO'
  }

  const contract = ERC20__factory.connect(tokenAddress.toString(), api);
  const contractSymbolBytes = ERC20SymbolBytes__factory.connect(
      tokenAddress.toString(),
      api
  );
  // try types string and bytes32 for symbol
  let symbolValue = "unknown";
  try {
    symbolValue = await contract.symbol();
  } catch (e) {
    // try {
    const symbolResultBytes = await contractSymbolBytes.callStatic.symbol();
    if (!(symbolResultBytes==NULL_CALL_RESULT_VALUE)) {
      symbolValue = symbolResultBytes.toString();
      // TODO: hexString -> utf8 string
      // throw new Error('Not implemented')
    } else {
      throw new Error(`Unknown symbol. Token#108`)
    }
  }
  return symbolValue;
}



export async function getName(address: String): Promise<string> {
  if (address.toString() == '0xe0b7927c4af23765cb51314a0e0521a9645f0e2a') {
    return 'DGD'
  }
  if (address.toString() == '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9') {
    return 'Aave Token'
  }
  if (address.toString() == '0x5dbcf33d8c2e976c6b560249878e6f1491bca25c') {
    return 'yUSD'
  }
  if (address.toString() == '0xf94b5c5651c888d928439ab6514b93944eee6f48') {
    return 'Yield App'
  }
  if (address.toString() == '0x0309c98b1bffa350bcb3f9fb9780970ca32a5060') {
    return 'BasketDAO DeFi Index'
  }
  if (address.toString() == '0x3fa729b4548becbad4eab6ef18413470e6d5324c') {
    return 'Mover'
  }
  if (address.toString() == '0xe95a203b1a91a908f9b9ce46459d101078c2c3cb') {
    return 'Ankr Eth2 Reward Bearing Certificate'
  }

  // CELO hardcode
  if (address.toString() == '0x471ece3750da237f93b8e339c536989b8978a438') {
    return 'Celo Native Asset'
  }


  const contract = ERC20__factory.connect(address.toString(), api);
  const contractSNameBytes = ERC20NameBytes__factory.connect(
      address.toString(),
      api
  );
  // try types string and bytes32 for name
  let symbolValue = "unknown";
  try {
    symbolValue = await contract.name();
  } catch (e) {
    // try {
    const symbolResultBytes = await contractSNameBytes.callStatic.name();
    if (!(symbolResultBytes==NULL_CALL_RESULT_VALUE)) {
      symbolValue = symbolResultBytes.toString();
      // TODO: hexString -> utf8 string
      // throw new Error('Not implemented')
    } else {
      throw new Error(`Unknown symbol. Token#108`)
    }
  }
  return symbolValue;
}

export async function getTotalSupply(address: String): Promise<BigNumber> {

  const contract = ERC20__factory.connect(address.toString(), api);

  try {
    return await contract.totalSupply(); // Should return a BigInt
  } catch (e)
  {
    return BigNumber.from("1");
  }

}

export async function getDecimals(address: String): Promise<BigNumber> {
  // hardcode overrides
  if (address.toString() == '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9') {
    return BigNumber.from("18");
  }

  const contract = ERC20__factory.connect(address.toString(), api);

  // try types uint8 for decimals
  let decimalValue = BigNumber.from(0);

  try {
    decimalValue=BigNumber.from(await contract.decimals());
  } catch(e)
  {
    // Exception from contract
  }
  return  decimalValue;
}
