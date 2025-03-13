import {
  TokenCreateTransaction,
  TokenMintTransaction,
  TokenInfoQuery,
  TokenType,
  AccountId,
  PrivateKey,
  TokenId,
  TransactionReceipt,
} from '@hashgraph/sdk';
import { client } from '../utils/client';
import { signAndExecuteTransaction, logWithTimestamp } from '../utils/helpers';

/**
 * Creates a mintable token with specified properties
 */
export async function createMintableToken(
  name: string,
  symbol: string,
  decimals: number,
  initialSupply: number,
  treasuryId: AccountId,
  supplyKey: PrivateKey
): Promise<TokenId> {
  const transaction = await new TokenCreateTransaction()
    .setTokenName(name)
    .setTokenSymbol(symbol)
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(decimals)
    .setInitialSupply(initialSupply)
    .setTreasuryAccountId(treasuryId)
    .setSupplyKey(supplyKey)
    .freezeWith(client);

  const receipt = await signAndExecuteTransaction(
    transaction,
    supplyKey,
    client
  );

  if (!receipt.tokenId) {
    throw new Error('Token ID is null');
  }

  logWithTimestamp(`Created mintable token with ID: ${receipt.tokenId}`);
  return receipt.tokenId;
}

/**
 * Creates a fixed supply token with specified properties
 */
export async function createFixedSupplyToken(
  name: string,
  symbol: string,
  decimals: number,
  initialSupply: number,
  treasuryId: AccountId,
  adminKey: PrivateKey
): Promise<TokenId> {
  const transaction = await new TokenCreateTransaction()
    .setTokenName(name)
    .setTokenSymbol(symbol)
    .setDecimals(decimals)
    .setInitialSupply(initialSupply)
    .setTreasuryAccountId(treasuryId)
    .freezeWith(client);

  const receipt = await signAndExecuteTransaction(
    transaction,
    adminKey,
    client
  );

  if (!receipt.tokenId) {
    throw new Error('Token ID is null');
  }

  logWithTimestamp(`Created fixed supply token with ID: ${receipt.tokenId}`);
  return receipt.tokenId;
}

/**
 * Mints additional tokens
 */
export async function mintTokens(
  tokenId: TokenId,
  amount: number,
  supplyKey: PrivateKey
): Promise<TransactionReceipt> {
  const transaction = await new TokenMintTransaction()
    .setTokenId(tokenId)
    .setAmount(amount)
    .freezeWith(client);

  return await signAndExecuteTransaction(transaction, supplyKey, client);
}

/**
 * Gets token information
 */
export async function getTokenInfo(tokenId: TokenId) {
  return await new TokenInfoQuery().setTokenId(tokenId).execute(client);
}
