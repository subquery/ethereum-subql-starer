import { Approval, Transfer } from "../types";
import {
  ApproveTransaction,
  TransferLog,
} from "../types/abi-interfaces/Erc20Abi";
import assert from "assert";

export async function handleLog(log: TransferLog): Promise<void> {
  logger.info(`New transfer transaction log at block ${log.blockNumber}`);
  assert(log.args, "No log.args")

  const transferRecord = Transfer.create({
    id: log.transactionHash,
    blockHeight: log.blockNumber.toString(),
    value: log.args.value.toBigInt(),
    from: log.args.from,
    to: log.args.to,
    contractAddress: log.address,
  });

  await transferRecord.save();
}

export async function handleTransaction(tx: ApproveTransaction): Promise<void> {
  assert(tx.args, "No tx.args")
  logger.info(`New Approval transaction at block ${tx.blockNumber}`);


  const approvalRecord = Approval.create({
    id: tx.hash,
    blockHeight: tx.blockNumber.toString(),
    owner: tx.from,
    spender: (await tx.args[0]).toString(),
    value: BigInt(await tx.args[1].toString()),
    contractAddress: tx.to,
  });

  await approvalRecord.save();
}

