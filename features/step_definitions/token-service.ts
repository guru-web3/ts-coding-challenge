import { Given, Then, When } from '@cucumber/cucumber';
import { accounts } from '../../src/config';
import {
  AccountBalanceQuery,
  Hbar,
  HbarUnit,
  TransferTransaction,
  AccountCreateTransaction,
  AccountId,
  Client,
  TransactionReceipt,
  PrivateKey,
  TokenCreateTransaction,
  TokenInfoQuery,
  TokenMintTransaction,
  TokenType,
  TokenId,
} from '@hashgraph/sdk';
import assert from 'node:assert';
import { Long } from '@hashgraph/sdk/lib/long';

// Type definitions for Token context
interface TokenContext {
  account_id?: AccountId;
  privateKey?: PrivateKey;
  tokenId?: TokenId;
  tokenId1?: TokenId;
  tokenId_fixed_supply?: TokenId;
  tokenId_1?: TokenId;
  firstAccountId?: AccountId;
  secondAccountId?: AccountId;
  thirdAccountId?: AccountId;
  fourthAccountId?: AccountId;
  firstAccountPrivateKey?: PrivateKey;
  secondAccountPrivateKey?: PrivateKey;
  thirdAccountPrivateKey?: PrivateKey;
  fourthAccountPrivateKey?: PrivateKey;
  transferTransaction?: TransferTransaction;
  initialHbarBalance?: Long;
  newAccountId?: AccountId;
  newAccountPrivateKey?: PrivateKey;
  expectedHbarBalance?: number;
  expectedTokenBalance?: number;
  clientId?: AccountId;
  client?: Client;
  secondAccountHbarBalance?: number;
  secondAccountTokenBalance?: number;
  thirdAccountHbarBalance?: number;
  thirdAccountTokenBalance?: number;
  fourthAccountHbarBalance?: number;
  fourthAccountTokenBalance?: number;
}

// Initialize Hedera client for testnet
const client = Client.forTestnet();
const clientID = AccountId.fromString(accounts[0].id);
const clientPrivateKey = PrivateKey.fromStringED25519(accounts[0].privateKey);
client.setOperator(clientID, clientPrivateKey);

/**
 * Utility function to sign and execute a transaction
 * @param transaction - The transaction to sign and execute
 * @param signerKey - The private key to sign the transaction with
 * @param clientToUse - The client to use for execution (defaults to global client)
 * @returns The transaction receipt
 */
export async function signAndExecuteTransaction(
  transaction:
    | TokenCreateTransaction
    | TokenMintTransaction
    | TransferTransaction,
  signerKey: PrivateKey,
  clientToUse: Client
): Promise<TransactionReceipt> {
  try {
    const signedTx = await transaction.sign(signerKey);
    const txResponse = await signedTx.execute(clientToUse);
    const receipt = await txResponse.getReceipt(clientToUse);
    return receipt;
  } catch (error: unknown) {
    console.error(
      `Transaction signing/execution failed: ${(error as Error).message}`
    );
    throw error;
  }
}

/**
 * Helper function to verify account balance
 * @param accountId - The account ID to check
 * @param expectedBalance - The minimum balance required in HBAR
 * @returns The actual balance in HBAR
 */
async function verifyAccountBalance(
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

// Scenario 1: Create a mintable token
Given(
  /^A Hedera account with more than (\d+) hbar$/,
  async function (this: TokenContext, expectedBalance: number) {
    try {
      const account = accounts[0];
      const MY_ACCOUNT_ID = AccountId.fromString(account.id);
      const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);
      this.account_id = MY_ACCOUNT_ID;
      this.privateKey = MY_PRIVATE_KEY;
      client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

      await verifyAccountBalance(MY_ACCOUNT_ID, expectedBalance);
      console.log(`Using account ${MY_ACCOUNT_ID} with sufficient balance`);
    } catch (error: unknown) {
      console.error(
        `Error setting up Hedera account: ${(error as Error).message}`
      );
      throw error;
    }
  }
);

When(
  /^I create a token named Test Token \(HTT\)$/,
  async function (this: TokenContext) {
    try {
      if (!this.account_id || !this.privateKey) {
        throw new Error('Account ID or private key is not defined');
      }

      const transaction = await new TokenCreateTransaction()
        .setTokenName('Test Token')
        .setTokenSymbol('HTT')
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(2)
        .setInitialSupply(0)
        .setTreasuryAccountId(this.account_id)
        .setSupplyKey(this.privateKey)
        .freezeWith(client);

      const receipt = await signAndExecuteTransaction(
        transaction,
        this.privateKey,
        client
      );
      if (receipt.tokenId) {
        this.tokenId = receipt.tokenId;
      } else {
        throw new Error('Token ID is null');
      }

      console.log(`Created mintable token with ID: ${this.tokenId}`);
    } catch (error: unknown) {
      console.error(`Error creating token: ${(error as Error).message}`);
      throw error;
    }
  }
);

Then(
  /^The token has the name "([^"]*)"$/,
  async function (this: TokenContext, expectedName: string) {
    try {
      if (!this.tokenId) {
        throw new Error(
          'Token ID is not defined. Cannot fetch token information.'
        );
      }

      const tokenInfo = await new TokenInfoQuery()
        .setTokenId(this.tokenId)
        .execute(client);

      assert.strictEqual(
        tokenInfo.name,
        expectedName,
        `Expected token name to be "${expectedName}", but got "${tokenInfo.name}".`
      );
      console.log(`Token name verified: ${tokenInfo.name}`);
    } catch (error: unknown) {
      console.error(`Error verifying token name: ${(error as Error).message}`);
      throw error;
    }
  }
);

Then(
  /^The token has the symbol "([^"]*)"$/,
  async function (this: TokenContext, expectedSymbol: string) {
    try {
      if (!this.tokenId) {
        throw new Error('Token ID is not defined');
      }
      const tokenInfo = await new TokenInfoQuery()
        .setTokenId(this.tokenId)
        .execute(client);
      assert.strictEqual(tokenInfo.symbol, expectedSymbol);
      console.log(`Token symbol verified: ${tokenInfo.symbol}`);
    } catch (error: unknown) {
      console.error(
        `Error verifying token symbol: ${(error as Error).message}`
      );
      throw error;
    }
  }
);

Then(
  /^The token has (\d+) decimals$/,
  async function (this: TokenContext, expectedDecimals: number) {
    try {
      if (!this.tokenId) {
        throw new Error('Token ID is not defined');
      }
      const tokenInfo = await new TokenInfoQuery()
        .setTokenId(this.tokenId)
        .execute(client);
      assert.strictEqual(tokenInfo.decimals, expectedDecimals);
      console.log(`Token decimals verified: ${tokenInfo.decimals}`);
    } catch (error: unknown) {
      console.error(
        `Error verifying token decimals: ${(error as Error).message}`
      );
      throw error;
    }
  }
);

Then(
  /^The token is owned by the account$/,
  async function (this: TokenContext) {
    try {
      if (!this.tokenId || !this.account_id) {
        throw new Error('Token ID or account ID is not defined');
      }

      const tokenInfo = await new TokenInfoQuery()
        .setTokenId(this.tokenId)
        .execute(client);

      if (tokenInfo.treasuryAccountId) {
        assert.strictEqual(
          tokenInfo.treasuryAccountId.toString(),
          this.account_id.toString(),
          'The token is not owned by the account'
        );

        // Store tokenId to tokenId1 before resetting
        this.tokenId1 = this.tokenId;
        delete this.tokenId;

        console.log(
          `Token ownership verified: treasury is ${tokenInfo.treasuryAccountId}`
        );
      } else {
        throw new Error('Token treasuryAccountId is null.');
      }
    } catch (error: unknown) {
      console.error(
        `Error verifying token ownership: ${(error as Error).message}`
      );
      throw error;
    }
  }
);

Then(
  /^An attempt to mint (\d+) additional tokens succeeds$/,
  async function (this: TokenContext, amount: number) {
    try {
      if (!this.tokenId1) {
        throw new Error('Token ID is not defined');
      }

      const mintTransaction = await new TokenMintTransaction()
        .setTokenId(this.tokenId1)
        .setAmount(amount)
        .freezeWith(client);

      const receipt = await signAndExecuteTransaction(
        mintTransaction,
        PrivateKey.fromStringED25519(accounts[0].privateKey),
        client
      );

      assert.strictEqual(
        receipt.status.toString(),
        'SUCCESS',
        'Minting failed.'
      );
      console.log(`Successfully minted ${amount} tokens`);
    } catch (error: unknown) {
      console.error(`Error minting tokens: ${(error as Error).message}`);
      throw error;
    }
  }
);
