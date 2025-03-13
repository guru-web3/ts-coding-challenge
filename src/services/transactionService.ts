import {
  TransferTransaction,
  AccountId,
  TokenId,
  PrivateKey,
  TransactionReceipt,
} from '@hashgraph/sdk';
import { client } from '../utils/client';
import { signAndExecuteTransaction, logWithTimestamp } from '../utils/helpers';

/**
 * Creates a token transfer transaction
 */
export async function createTokenTransfer(
  tokenId: TokenId,
  fromAccountId: AccountId,
  toAccountId: AccountId,
  amount: number
): Promise<TransferTransaction> {
  return new TransferTransaction()
    .addTokenTransfer(tokenId, fromAccountId, -amount)
    .addTokenTransfer(tokenId, toAccountId, amount)
    .freezeWith(client);
}

/**
 * Creates a multi-party token transfer transaction
 */
export async function createMultiPartyTokenTransfer(
  tokenId: TokenId,
  transfers: { accountId: AccountId; amount: number }[]
): Promise<TransferTransaction> {
  const transaction = new TransferTransaction();

  // Validate that transfers sum to zero
  const sum = transfers.reduce((acc, transfer) => acc + transfer.amount, 0);
  if (Math.abs(sum) > 0.001) {
    throw new Error(`Transfer amounts must sum to zero, got ${sum}`);
  }

  for (const transfer of transfers) {
    transaction.addTokenTransfer(tokenId, transfer.accountId, transfer.amount);
  }

  return transaction.freezeWith(client);
}

/**
 * Executes a transaction with the specified signer
 */
export async function executeTransaction(
  transaction: TransferTransaction,
  signerKey: PrivateKey
): Promise<TransactionReceipt> {
  const receipt = await signAndExecuteTransaction(
    transaction,
    signerKey,
    client
  );
  logWithTimestamp(`Transaction executed with status: ${receipt.status}`);
  return receipt;
}
