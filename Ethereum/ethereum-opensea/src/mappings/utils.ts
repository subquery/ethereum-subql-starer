import assert from "assert";
import {
  Address,
  BigDecimal,
  Bytes,
  ethereum,
  BigInt,
} from "@graphprotocol/graph-ts";
import { AtomicMatch_Transaction } from "../types/abi-interfaces/OpenSeaV2";
import {
  BIGINT_ONE,
  BIGINT_ZERO,
  ERC1155_SAFE_TRANSFER_FROM_SELECTOR,
  ERC721_SAFE_TRANSFER_FROM_SELECTOR,
  ETHABI_DECODE_PREFIX,
  MATCH_ERC1155_SAFE_TRANSFER_FROM_SELECTOR,
  MATCH_ERC721_SAFE_TRANSFER_FROM_SELECTOR,
  MATCH_ERC721_TRANSFER_FROM_SELECTOR,
  NULL_ADDRESS,
  SaleStrategy,
  Side,
  TRANSFER_FROM_SELECTOR,
} from "./constants";

export class DecodedTransferResult {
  constructor(
    public readonly method: string,
    public readonly from: Address,
    public readonly to: Address,
    public readonly token: Address,
    public readonly tokenId: BigInt,
    public readonly amount: BigInt
  ) {}
}

export class DecodedAtomicizeResult {
  constructor(
    public readonly targets: Address[],
    public readonly callDatas: Bytes[]
  ) {}
}

/**
 * Get first 4 bytes of the calldata (function selector/method ID)
 */
export function getFunctionSelector(callData: Bytes): string {
  return Bytes.fromUint8Array(callData.subarray(0, 4)).toHexString();
}

/**
 * Get order side from side parameter
 * enum Side { Buy, Sell }
 * https://github.com/ProjectWyvern/wyvern-ethereum/blob/bfca101b2407e4938398fccd8d1c485394db7e01/contracts/exchange/SaleKindInterface.sol#L22
 */
export function getOrderSide(side: number): string {
  if (side == 0) {
    return Side.BUY;
  } else {
    return Side.SELL;
  }
}

/**
 * Get sale strategy from saleKind parameter
 * enum SaleKind { FixedPrice, DutchAuction }
 * https://github.com/ProjectWyvern/wyvern-ethereum/blob/bfca101b2407e4938398fccd8d1c485394db7e01/contracts/exchange/SaleKindInterface.sol#L29
 */
export function getSaleStrategy(saleKind: number): string {
  if (saleKind == 0) {
    return SaleStrategy.STANDARD_SALE;
  } else {
    return SaleStrategy.DUTCH_AUCTION;
  }
}

/**
 * Validate function selectors that can be decoded
 * Relevant function selectors/method IDs can be found via https://www.4byte.directory
 */
export function validateCallDataFunctionSelector(callData: Bytes): boolean {
  const functionSelector = getFunctionSelector(callData);
  return (
    functionSelector == TRANSFER_FROM_SELECTOR ||
    functionSelector == ERC721_SAFE_TRANSFER_FROM_SELECTOR ||
    functionSelector == ERC1155_SAFE_TRANSFER_FROM_SELECTOR ||
    functionSelector == MATCH_ERC721_TRANSFER_FROM_SELECTOR ||
    functionSelector == MATCH_ERC721_SAFE_TRANSFER_FROM_SELECTOR ||
    functionSelector == MATCH_ERC1155_SAFE_TRANSFER_FROM_SELECTOR
  );
}

/**
 * Split up/atomicize a set of calldata bytes into individual ERC721/1155 transfer calldata bytes
 * Creates a list of calldatas which can be decoded in decodeSingleNftData
 */
export function atomicizeCallData(
  callDatas: Bytes,
  callDataLengths: BigInt[]
): Bytes[] {
  const atomicizedCallData: Bytes[] = [];
  let index = 0;
  for (let i = 0; i < callDataLengths.length; i++) {
    const length = Number(callDataLengths[i].toString());
    const callData = Bytes.fromUint8Array(
      callDatas.subarray(index, index + length)
    );
    atomicizedCallData.push(callData);
    index += length;
  }

  return atomicizedCallData;
}

/**
 * Calculate the price two orders would match at, if in fact they would match (otherwise fail)
 * Returns sellPrice for sell-side order maker (sale) and buyPrice for buy-side order maker (bid/offer)
 * https://github.com/ProjectWyvern/wyvern-ethereum/blob/bfca101b2407e4938398fccd8d1c485394db7e01/contracts/exchange/ExchangeCore.sol#L460
 */
export function calculateMatchPrice(call: AtomicMatch_Transaction): number {
  assert(call.args, "No call args");
  const sellSideFeeRecipient = call.args[0][10];

  const sellSide = Number(call.args[2][5]);
  const sellSaleKind = Number(call.args[2][6]);
  const sellBasePrice = Number(call.args[1][13].toString());
  const sellExtra = Number(call.args[1][14].toString());
  const sellListingTime = Number(call.args[1][15].toString());
  const sellExpirationTime = Number(call.args[1][16].toString());

  // Calculate sell price
  const sellPrice = calculateFinalPrice(
    sellSide,
    sellSaleKind,
    sellBasePrice,
    sellExtra,
    sellListingTime,
    sellExpirationTime,
    Number(call.blockTimestamp)
  );

  const buySide = Number(call.args[2][1]);
  const buySaleKind = Number(call.args[2][2]);
  const buyBasePrice = Number(call.args[1][4].toString());
  const buyExtra = Number(call.args[1][5].toString());
  const buyListingTime = Number(call.args[1][6].toString());
  const buyExpirationTime = Number(call.args[1][7].toString());

  // Calculate buy price
  const buyPrice = calculateFinalPrice(
    buySide,
    buySaleKind,
    buyBasePrice,
    buyExtra,
    buyListingTime,
    buyExpirationTime,
    Number(call.blockTimestamp)
  );

  // Maker/taker priority
  return sellSideFeeRecipient.toString() != NULL_ADDRESS.toString()
    ? sellPrice
    : buyPrice;
}

/**
 * Calculate the settlement price of an order using Order paramters
 * Returns basePrice if FixedPrice sale or calculate auction settle price if DutchAuction sale
 * https://github.com/ProjectWyvern/wyvern-ethereum/blob/bfca101b2407e4938398fccd8d1c485394db7e01/contracts/exchange/SaleKindInterface.sol#L70
 * NOTE: "now" keyword is simply an alias for block.timestamp
 * https://docs.soliditylang.org/en/v0.4.26/units-and-global-variables.html?highlight=now#block-and-transaction-properties
 */
export function calculateFinalPrice(
  side: number,
  saleKind: number,
  basePrice: number,
  extra: number,
  listingTime: number,
  expirationTime: number,
  now: number
): number {
  if (getSaleStrategy(saleKind) == SaleStrategy.STANDARD_SALE) {
    return basePrice;
  } else if (getSaleStrategy(saleKind) == SaleStrategy.DUTCH_AUCTION) {
    const diff = (extra * (now - listingTime)) / (expirationTime - listingTime);
    if (getOrderSide(side) == Side.SELL) {
      return basePrice - diff;
    } else {
      return basePrice + diff;
    }
  } else {
    return 0;
  }
}

/**
 * Replace bytes in an array with bytes in another array, guarded by a bitmask
 * Used to merge calldataBuy and calldataSell using replacementPattern as a bitmask to recreate calldata sent to sell.target
 * https://github.com/ProjectWyvern/wyvern-ethereum/blob/bfca101b2407e4938398fccd8d1c485394db7e01/contracts/common/ArrayUtils.sol#L28
 */
export function guardedArrayReplace(
  _array: Bytes,
  _replacement: Bytes,
  _mask: Bytes
): Bytes {
  // If replacementPattern is empty, meaning that both arrays buyCallData == sellCallData,
  // no merging is necessary. Returns first array (buyCallData)
  if (_mask.length == 0) {
    return _array;
  }

  // Copies original Bytes Array to avoid buffer overwrite
  const array = Bytes.fromUint8Array(_array.slice(0));
  const replacement = Bytes.fromUint8Array(_replacement.slice(0));
  const mask = Bytes.fromUint8Array(_mask.slice(0));

  array.reverse();
  replacement.reverse();
  mask.reverse();

  let bigIntArray = BigInt.fromUnsignedBytes(array);
  let bigIntReplacement = BigInt.fromUnsignedBytes(replacement);
  const bigIntMask = BigInt.fromUnsignedBytes(mask);

  bigIntReplacement = bigIntReplacement.bitAnd(bigIntMask);
  bigIntArray = bigIntArray.bitOr(bigIntReplacement);
  return Bytes.fromHexString(bigIntArray.toHexString());
}

/**
 * Decode Ethereum calldata of transferFrom/safeTransferFrom calls using function signature
 * 0x23b872dd transferFrom(address,address,uint256)
 * 0x42842e0e safeTransferFrom(address,address,uint256)
 * https://www.4byte.directory/signatures/?bytes4_signature=0x23b872dd
 * https://www.4byte.directory/signatures/?bytes4_signature=0x42842e0e
 */
export function decode_ERC721Transfer_Method(
  target: Address,
  callData: Bytes
): DecodedTransferResult {
  const functionSelector = getFunctionSelector(callData);
  const dataWithoutFunctionSelector = Bytes.fromUint8Array(
    callData.subarray(4)
  );

  const decoded = ethereum
    .decode("(address,address,uint256)", dataWithoutFunctionSelector)!
    .toTuple();
  const senderAddress = decoded[0].toAddress();
  const recieverAddress = decoded[1].toAddress();
  const tokenId = decoded[2].toBigInt();

  return new DecodedTransferResult(
    functionSelector,
    senderAddress,
    recieverAddress,
    target,
    tokenId,
    BIGINT_ONE
  );
}

/**
 * Decode Ethereum calldata of safeTransferFrom call using function signature
 * 0xf242432a safeTransferFrom(address,address,uint256,uint256,bytes)
 * https://www.4byte.directory/signatures/?bytes4_signature=0xf242432a
 * NOTE: needs ETHABI_DECODE_PREFIX to decode (contains arbitrary bytes)
 */
export function decode_ERC1155Transfer_Method(
  target: Address,
  callData: Bytes
): DecodedTransferResult {
  const functionSelector = getFunctionSelector(callData);
  const dataWithoutFunctionSelector = Bytes.fromUint8Array(
    callData.subarray(4)
  );
  const dataWithoutFunctionSelectorWithPrefix = ETHABI_DECODE_PREFIX.concat(
    dataWithoutFunctionSelector
  );

  const decoded = ethereum
    .decode(
      "(address,address,uint256,uint256,bytes)",
      dataWithoutFunctionSelectorWithPrefix
    )!
    .toTuple();
  const senderAddress = decoded[0].toAddress();
  const recieverAddress = decoded[1].toAddress();
  const tokenId = decoded[2].toBigInt();
  const amount = decoded[3].toBigInt();

  return new DecodedTransferResult(
    functionSelector,
    senderAddress,
    recieverAddress,
    target,
    tokenId,
    amount
  );
}

/**
 * Decode Ethereum calldata of matchERC721UsingCriteria/matchERC721WithSafeTransferUsingCriteria calls using function signature
 * 0xfb16a595 matchERC721UsingCriteria(address,address,address,uint256,bytes32,bytes32[])
 * 0xc5a0236e matchERC721WithSafeTransferUsingCriteria(address,address,address,uint256,bytes32,bytes32[])
 * https://www.4byte.directory/signatures/?bytes4_signature=0xfb16a595
 * https://www.4byte.directory/signatures/?bytes4_signature=0xc5a0236e
 * NOTE: needs ETHABI_DECODE_PREFIX to decode (contains arbitrary bytes/bytes array)
 */
export function decode_matchERC721UsingCriteria_Method(
  callData: Bytes
): DecodedTransferResult {
  const functionSelector = getFunctionSelector(callData);
  const dataWithoutFunctionSelector = Bytes.fromUint8Array(
    callData.subarray(4)
  );
  const dataWithoutFunctionSelectorWithPrefix = ETHABI_DECODE_PREFIX.concat(
    dataWithoutFunctionSelector
  );

  const decoded = ethereum
    .decode(
      "(address,address,address,uint256,bytes32,bytes32[])",
      dataWithoutFunctionSelectorWithPrefix
    )!
    .toTuple();
  const senderAddress = decoded[0].toAddress();
  const recieverAddress = decoded[1].toAddress();
  const nftContractAddress = decoded[2].toAddress();
  const tokenId = decoded[3].toBigInt();

  return new DecodedTransferResult(
    functionSelector,
    senderAddress,
    recieverAddress,
    nftContractAddress,
    tokenId,
    BIGINT_ONE
  );
}

/**
 * Decode Ethereum calldata of matchERC1155UsingCriteria call using function signature
 * 0x96809f90 matchERC1155UsingCriteria(address,address,address,uint256,uint256,bytes32,bytes32[])
 * https://www.4byte.directory/signatures/?bytes4_signature=0x96809f90
 * NOTE: needs ETHABI_DECODE_PREFIX to decode (contains arbitrary bytes/bytes array)
 */
export function decode_matchERC1155UsingCriteria_Method(
  callData: Bytes
): DecodedTransferResult {
  const functionSelector = getFunctionSelector(callData);
  const dataWithoutFunctionSelector = Bytes.fromUint8Array(
    callData.subarray(4)
  );
  const dataWithoutFunctionSelectorWithPrefix = ETHABI_DECODE_PREFIX.concat(
    dataWithoutFunctionSelector
  );

  const decoded = ethereum
    .decode(
      "(address,address,address,uint256,uint256,bytes32,bytes32[])",
      dataWithoutFunctionSelectorWithPrefix
    )!
    .toTuple();
  const senderAddress = decoded[0].toAddress();
  const recieverAddress = decoded[1].toAddress();
  const nftContractAddress = decoded[2].toAddress();
  const tokenId = decoded[3].toBigInt();
  const amount = decoded[4].toBigInt();

  return new DecodedTransferResult(
    functionSelector,
    senderAddress,
    recieverAddress,
    nftContractAddress,
    tokenId,
    amount
  );
}

/**
 * Decode Ethereum calldata of atomicize call using function signature
 * 0x68f0bcaa atomicize(address[],uint256[],uint256[],bytes)
 * https://www.4byte.directory/signatures/?bytes4_signature=0x68f0bcaa
 * NOTE: needs ETHABI_DECODE_PREFIX to decode (contains arbitrary bytes/arrays)
 */
export function decode_atomicize_Method(
  callData: Bytes
): DecodedAtomicizeResult {
  const dataWithoutFunctionSelector = Bytes.fromUint8Array(
    callData.subarray(4)
  );
  const dataWithoutFunctionSelectorWithPrefix = ETHABI_DECODE_PREFIX.concat(
    dataWithoutFunctionSelector
  );
  const decoded = ethereum
    .decode(
      "(address[],uint256[],uint256[],bytes)",
      dataWithoutFunctionSelectorWithPrefix
    )!
    .toTuple();
  const targets = decoded[0].toAddressArray();
  const callDataLengths = decoded[2].toBigIntArray();
  const callDatas = decoded[3].toBytes();

  const atomicizedCallDatas = atomicizeCallData(callDatas, callDataLengths);

  return new DecodedAtomicizeResult(targets, atomicizedCallDatas);
}

export function decode_nftTransfer_Method(
  target: Address,
  callData: Bytes
): DecodedTransferResult {
  const functionSelector = getFunctionSelector(callData);
  if (
    functionSelector == TRANSFER_FROM_SELECTOR ||
    functionSelector == ERC721_SAFE_TRANSFER_FROM_SELECTOR
  ) {
    return decode_ERC721Transfer_Method(target, callData);
  } else if (
    functionSelector == MATCH_ERC721_TRANSFER_FROM_SELECTOR ||
    functionSelector == MATCH_ERC721_SAFE_TRANSFER_FROM_SELECTOR
  ) {
    return decode_matchERC721UsingCriteria_Method(callData);
  } else if (functionSelector == ERC1155_SAFE_TRANSFER_FROM_SELECTOR) {
    return decode_ERC1155Transfer_Method(target, callData);
  } else {
    return decode_matchERC1155UsingCriteria_Method(callData);
  }
}

export function min(a: Number, b: Number): Number {
  return a < b ? a : b;
}

export function max(a: Number, b: Number): Number {
  return a < b ? b : a;
}
