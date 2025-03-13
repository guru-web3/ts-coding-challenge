import {
  AccountBalanceQuery,
  AccountCreateTransaction,
  AccountId,
  Hbar,
  HbarUnit,
  PrivateKey,
  TokenId
} from '@hashgraph/sdk';
import { client } from '../utils/client';
import assert from 'node:assert';
import { logWithTimestamp } from '../utils/helpers';

/**
 * Helper function to verify account balance
 */
export async function verifyAccountBalance(
  accountId: AccountId,
  expectedBalance?: number
): Promise<number> {
  try {
    const query = new AccountBalanceQuery().setAccountId(accountId);
    const balance = await query.execute(client);
    const balanceValue = balance.hbars.toBigNumber().toNumber();

    if (expectedBalance !== undefined) {
      assert.ok(
        balanceValue > expectedBalance,
        `Account balance (${balanceValue}) is not greater than ${expectedBalance} HBAR`
      );
    }

    return balanceValue;
  } catch (error: unknown) {
    console.error(`Failed to verify account balance: ${error}`);
    throw error;
  }
}

/**
 * Creates a new Hedera account with specified initial balance
 */
export async function createAccount(
  initialBalance: number, 
  maxTokenAssociations = 10
): Promise<{ accountId: AccountId; privateKey: PrivateKey }> {
  // Generate a new ED25519 key pair
  const privateKey = PrivateKey.generateED25519();
  const publicKey = privateKey.publicKey;

  // Create the account with an initial balance
  const transaction = await new AccountCreateTransaction()
    .setKey(publicKey)
    .setInitialBalance(Hbar.from(initialBalance, HbarUnit.Hbar))
    .setMaxAutomaticTokenAssociations(maxTokenAssociations)
    .execute(client);

  const receipt = await transaction.getReceipt(client);
  
  if (!receipt.accountId) {
    throw new Error('Failed to create account: accountId is null');
  }

  logWithTimestamp(`Created account with ID: ${receipt.accountId}`);
  
  return {
    accountId: receipt.accountId,
    privateKey: privateKey
  };
}

/**
 * Gets token balance for an account
 */
export async function getTokenBalance(
  accountId: AccountId,
  tokenId: TokenId
): Promise<number> {
  const balance = await new AccountBalanceQuery()
    .setAccountId(accountId)
    .execute(client);

  return balance.tokens?.get(tokenId)?.toNumber() || 0;
}
