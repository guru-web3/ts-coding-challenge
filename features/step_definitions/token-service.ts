// test/features/tokenService.test.ts
import { Given, Then, When } from '@cucumber/cucumber';
import { accounts } from '../../src/config';
import {
  AccountId,
  PrivateKey,
  TokenId,
  TransferTransaction,
  Long
} from '@hashgraph/sdk';
import assert from 'node:assert';
import { createAccount, getTokenBalance, verifyAccountBalance } from '../../src/services/accountService';
import { createFixedSupplyToken, createMintableToken, getTokenInfo, mintTokens } from '../../src/services/tokenService';
import { createMultiPartyTokenTransfer, createTokenTransfer, executeTransaction } from '../../src/services/transactionService';
import { client, clientID, clientPrivateKey } from '../../src/utils/client';
import { signAndExecuteTransaction, logWithTimestamp } from '../../src/utils/helpers';

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
  secondAccountHbarBalance?: number;
  secondAccountTokenBalance?: number;
  thirdAccountHbarBalance?: number;
  thirdAccountTokenBalance?: number;
  fourthAccountHbarBalance?: number;
  fourthAccountTokenBalance?: number;
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
      logWithTimestamp(`Using account ${MY_ACCOUNT_ID} with sufficient balance`);
    } catch (error: unknown) {
      console.error(`Error setting up Hedera account: ${(error as Error).message}`);
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
      
      this.tokenId = await createMintableToken(
        'Test Token',
        'HTT',
        2,
        0,
        this.account_id,
        this.privateKey
      );

      logWithTimestamp(`Created mintable token with ID: ${this.tokenId}`);
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
        throw new Error('Token ID is not defined. Cannot fetch token information.');
      }

      const tokenInfo = await getTokenInfo(this.tokenId);

      assert.strictEqual(
        tokenInfo.name,
        expectedName,
        `Expected token name to be "${expectedName}", but got "${tokenInfo.name}".`
      );
      logWithTimestamp(`Token name verified: ${tokenInfo.name}`);
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
      const tokenInfo = await getTokenInfo(this.tokenId);
      assert.strictEqual(tokenInfo.symbol, expectedSymbol);
      logWithTimestamp(`Token symbol verified: ${tokenInfo.symbol}`);
    } catch (error: unknown) {
      console.error(`Error verifying token symbol: ${(error as Error).message}`);
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
      const tokenInfo = await getTokenInfo(this.tokenId);
      assert.strictEqual(tokenInfo.decimals, expectedDecimals);
      logWithTimestamp(`Token decimals verified: ${tokenInfo.decimals}`);
    } catch (error: unknown) {
      console.error(`Error verifying token decimals: ${(error as Error).message}`);
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

      const tokenInfo = await getTokenInfo(this.tokenId);

      if (tokenInfo.treasuryAccountId) {
        assert.strictEqual(
          tokenInfo.treasuryAccountId.toString(),
          this.account_id.toString(),
          'The token is not owned by the account'
        );

        // Store tokenId to tokenId1 before resetting
        this.tokenId1 = this.tokenId;
        delete this.tokenId;

        logWithTimestamp(`Token ownership verified: treasury is ${tokenInfo.treasuryAccountId}`);
      } else {
        throw new Error('Token treasuryAccountId is null.');
      }
    } catch (error: unknown) {
      console.error(`Error verifying token ownership: ${(error as Error).message}`);
      throw error;
    }
  }
);

Then(
  /^An attempt to mint (\d+) additional tokens succeeds$/,
  async function (this: TokenContext, amount: number) {
    try {
      if (!this.tokenId1 || !this.privateKey) {
        throw new Error('Token ID or private key is not defined');
      }

      const receipt = await mintTokens(this.tokenId1, amount, this.privateKey);
      
      assert.strictEqual(
        receipt.status.toString(),
        'SUCCESS',
        'Minting failed.'
      );
      logWithTimestamp(`Successfully minted ${amount} tokens`);
    } catch (error: unknown) {
      console.error(`Error minting tokens: ${(error as Error).message}`);
      throw error;
    }
  }
);

// Scenario 2: Create a fixed supply token
When(
  /^I create a fixed supply token named Test Token \(HTT\) with (\d+) tokens$/,
  async function (this: TokenContext, supply: number) {
    try {
      if (!this.account_id || !this.privateKey) {
        throw new Error('Account ID or private key is not defined');
      }

      this.tokenId_fixed_supply = await createFixedSupplyToken(
        'Test Token',
        'HTT',
        2,
        supply,
        this.account_id,
        this.privateKey
      );
      
      this.tokenId = this.tokenId_fixed_supply;
      logWithTimestamp(`Fixed supply token created with ID: ${this.tokenId_fixed_supply.toString()}`);
    } catch (error: unknown) {
      console.error(`Error creating fixed supply token: ${(error as Error).message}`);
      throw error;
    }
  }
);

Then(
  /^The total supply of the token is (\d+)$/,
  async function (this: TokenContext, expectedSupply: number) {
    try {
      if (!this.tokenId_fixed_supply) {
        throw new Error('Token ID is not defined');
      }

      const tokenInfo = await getTokenInfo(this.tokenId_fixed_supply);
      assert.strictEqual(
        tokenInfo.totalSupply.toString(),
        expectedSupply.toString()
      );
      logWithTimestamp(`Token total supply verified: ${tokenInfo.totalSupply.toString()}`);
    } catch (error: unknown) {
      console.error(`Error verifying token supply: ${(error as Error).message}`);
      throw error;
    }
  }
);

Then(
  /^An attempt to mint tokens fails$/,
  { timeout: 300000 },
  async function (this: TokenContext) {
    try {
      if (!this.tokenId_fixed_supply || !this.privateKey) {
        throw new Error('Token ID or private key is not defined');
      }

      try {
        await mintTokens(this.tokenId_fixed_supply, 100, this.privateKey);
        throw new Error('Minting should have failed but succeeded');
      } catch (error) {
        logWithTimestamp('Minting attempt failed as expected');
      }
    } catch (error: unknown) {
      console.error(`Unexpected error: ${(error as Error).message}`);
      throw error;
    }
  }
);

// Scenario 3: Transfer tokens between 2 accounts
Given(
  /^A first hedera account with more than (\d+) hbar$/,
  async function (this: TokenContext, expectedBalance: number) {
    try {
      const { accountId, privateKey } = await createAccount(expectedBalance + 10);
      
      this.firstAccountId = accountId;
      this.firstAccountPrivateKey = privateKey;
      
      logWithTimestamp(`First account created with ID: ${this.firstAccountId}`);
    } catch (error: unknown) {
      console.error(`Error creating first Hedera account: ${(error as Error).message}`);
      throw error;
    }
  }
);

Given(/^A second Hedera account$/, async function (this: TokenContext) {
  try {
    const { accountId, privateKey } = await createAccount(10);
    
    this.secondAccountId = accountId;
    this.secondAccountPrivateKey = privateKey;
    
    logWithTimestamp(`Second account created with ID: ${this.secondAccountId}`);
  } catch (error: unknown) {
    console.error(`Error creating second Hedera account: ${(error as Error).message}`);
    throw error;
  }
});

Given(
  /^A token named Test Token \(HTT\) with (\d+) tokens$/,
  async function (this: TokenContext, supply: number) {
    try {
      this.tokenId_1 = await createMintableToken(
        'Test Token',
        'HTT',
        0,
        supply,
        clientID,
        clientPrivateKey
      );
      
      logWithTimestamp(`Created token with ID: ${this.tokenId_1} and supply: ${supply}`);
    } catch (error: unknown) {
      console.error(`Error creating named token: ${(error as Error).message}`);
      throw error;
    }
  }
);

Given(
  /^The first account holds (\d+) HTT tokens$/,
  { timeout: 400000 },
  async function (this: TokenContext, expectedAmount: number) {
    try {
      if (!this.firstAccountId || !this.tokenId_1) {
        throw new Error('First account ID or token ID is not defined');
      }

      // Check initial balance
      let tokenBalance = await getTokenBalance(this.firstAccountId, this.tokenId_1);

      // If the balance is not as expected, perform the transfer
      if (tokenBalance !== expectedAmount) {
        const transferTransaction = await createTokenTransfer(
          this.tokenId_1,
          clientID,
          this.firstAccountId,
          expectedAmount
        );

        await signAndExecuteTransaction(transferTransaction, clientPrivateKey, client);
        
        // Verify the new balance
        tokenBalance = await getTokenBalance(this.firstAccountId, this.tokenId_1);
      }

      assert.strictEqual(tokenBalance, expectedAmount);
      logWithTimestamp(`First account now holds ${tokenBalance} HTT tokens`);
    } catch (error: unknown) {
      console.error(`Error setting first account token balance: ${(error as Error).message}`);
      throw error;
    }
  }
);

Given(
  /^The second account holds (\d+) HTT tokens$/,
  async function (this: TokenContext, expectedAmount: number) {
    try {
      if (!this.secondAccountId || !this.tokenId_1) {
        throw new Error('Second account ID or token ID is not defined');
      }

      // Check initial balance
      let tokenBalance = await getTokenBalance(this.secondAccountId, this.tokenId_1);

      // If the balance is not as expected, perform the transfer
      if (tokenBalance !== expectedAmount) {
        const transferTransaction = await createTokenTransfer(
          this.tokenId_1,
          clientID,
          this.secondAccountId,
          expectedAmount
        );

        await signAndExecuteTransaction(transferTransaction, clientPrivateKey, client);
        
        // Verify the new balance
        tokenBalance = await getTokenBalance(this.secondAccountId, this.tokenId_1);
      }

      assert.strictEqual(tokenBalance, expectedAmount);
      logWithTimestamp(`Second account now holds ${tokenBalance} HTT tokens`);
    } catch (error: unknown) {
      console.error(`Error setting second account token balance: ${(error as Error).message}`);
      throw error;
    }
  }
);

When(
  /^The first account creates a transaction to transfer (\d+) HTT tokens to the second account$/,
  async function (this: TokenContext, amount: number) {
    try {
      if (!this.firstAccountId || !this.secondAccountId || !this.tokenId_1) {
        throw new Error('Account IDs or token ID is not defined');
      }

      this.transferTransaction = await createTokenTransfer(
        this.tokenId_1,
        this.firstAccountId,
        this.secondAccountId,
        amount
      );

      logWithTimestamp(`Transaction created to transfer ${amount} HTT tokens from first to second account`);
    } catch (error: unknown) {
      console.error(`Error creating transfer transaction: ${(error as Error).message}`);
      throw error;
    }
  }
);

When(
  /^The first account submits the transaction$/,
  async function (this: TokenContext) {
    try {
      if (!this.transferTransaction || !this.firstAccountPrivateKey) {
        throw new Error('Transfer transaction or first account private key is not defined');
      }

      await executeTransaction(this.transferTransaction, this.firstAccountPrivateKey);
      logWithTimestamp('Transaction submitted successfully');
    } catch (error: unknown) {
      console.error(`Error submitting transaction: ${(error as Error).message}`);
      throw error;
    }
  }
);

// Scenario 4: Create a token transfer transaction paid for by the recipient
When(
  /^The second account creates a transaction to transfer (\d+) HTT tokens to the first account$/,
  async function (this: TokenContext, amount: number) {
    try {
      if (!this.firstAccountId || !this.secondAccountId || !this.tokenId_1) {
        throw new Error('Account IDs or token ID is not defined');
      }

      // Get initial balance of first account
      const initialBalance = await verifyAccountBalance(this.firstAccountId);
      this.initialHbarBalance = Long.fromNumber(initialBalance * 100_000_000);
      
      logWithTimestamp(`Initial Hbar balance of the first account: ${this.initialHbarBalance.toString()}`);

      // Create the transfer transaction
      this.transferTransaction = await createTokenTransfer(
        this.tokenId_1,
        this.secondAccountId,
        this.firstAccountId,
        amount
      );

      // Sign with second account's key
      if (!this.secondAccountPrivateKey) {
        throw new Error('Second account private key is not defined');
      }
      
      this.transferTransaction = await this.transferTransaction.sign(this.secondAccountPrivateKey);
      
      logWithTimestamp(`Transaction created by second account to transfer ${amount} HTT tokens to first account`);
    } catch (error: unknown) {
      console.error(`Error creating transfer transaction from second account: ${(error as Error).message}`);
      throw error;
    }
  }
);

Then(
  /^The first account has paid for the transaction fee$/,
  async function (this: TokenContext) {
    try {
      if (!this.firstAccountId || !this.initialHbarBalance) {
        throw new Error('First account ID or initial Hbar balance is not defined');
      }

      // Check final balance
      const finalBalance = await verifyAccountBalance(this.firstAccountId);
      const finalHbarBalance = Long.fromNumber(finalBalance * 100_000_000);
      
      logWithTimestamp(`Final Hbar balance of the first account: ${finalHbarBalance.toString()}`);

      assert.strictEqual(
        finalHbarBalance.toString(),
        this.initialHbarBalance.toString(),
        'The first account has not paid for the transaction fee'
      );

      logWithTimestamp('First account has paid for the transaction fee');
    } catch (error: unknown) {
      console.error(`Error verifying transaction fee payment: ${(error as Error).message}`);
      throw error;
    }
  }
);

// Scenario 5: Create a multi party token transfer transaction
Given(
  /^A first hedera account with more than (\d+) hbar and (\d+) HTT tokens$/,
  { timeout: 60000 },
  async function (this: TokenContext, expectedAmount1: number, expectedAmount2: number) {
    try {
      // Create a new account with sufficient balance
      const { accountId, privateKey } = await createAccount(expectedAmount1 + 10, 10);
      this.newAccountId = accountId;
      this.firstAccountId = accountId;
      this.newAccountPrivateKey = privateKey;
      this.firstAccountPrivateKey = privateKey;
      
      logWithTimestamp(`New account created with ID: ${this.newAccountId}`);
      
      // Use existing token or create one if needed
      this.tokenId1 = this.tokenId_1;
      if (!this.tokenId1) {
        throw new Error('Token ID is not defined');
      }
      
      // Transfer tokens to the new account
      const transferTransaction = await createTokenTransfer(
        this.tokenId1,
        clientID,
        this.newAccountId,
        expectedAmount2
      );
      
      await signAndExecuteTransaction(transferTransaction, clientPrivateKey, client);
      
      // Verify token balance
      const tokenBalance = await getTokenBalance(this.newAccountId, this.tokenId1);
      assert.strictEqual(tokenBalance, expectedAmount2);
      
      logWithTimestamp(`${expectedAmount2} tokens transferred to account ${this.newAccountId}`);
      
      this.expectedHbarBalance = expectedAmount1;
      this.expectedTokenBalance = expectedAmount2;
    } catch (error: unknown) {
      console.error(`Error setting up first account with tokens: ${(error as Error).message}`);
      throw error;
    }
  }
);

Given(
  /^A second Hedera account with (\d+) hbar and (\d+) HTT tokens$/,
  { timeout: 60000 },
  async function (this: TokenContext, hbarAmount: number, tokenAmount: number) {
    try {
      if (!this.tokenId1) {
        this.tokenId1 = this.tokenId_1; // Use tokenId_1 if tokenId1 is not set
      }
      
      if (!this.tokenId1) {
        throw new Error('Token ID is not defined');
      }
      
      // Create a new account with specified balance
      const { accountId, privateKey } = await createAccount(hbarAmount, 10);
      this.secondAccountId = accountId;
      this.secondAccountPrivateKey = privateKey;
      
      logWithTimestamp(`Second account created with ID: ${this.secondAccountId}`);
      
      // Transfer tokens to the second account
      const transferTransaction = await createTokenTransfer(
        this.tokenId1,
        clientID,
        this.secondAccountId,
        tokenAmount
      );
      
      await signAndExecuteTransaction(transferTransaction, clientPrivateKey, client);
      
      // Verify token balance
      const tokenBalance = await getTokenBalance(this.secondAccountId, this.tokenId1);
      assert.strictEqual(tokenBalance, tokenAmount);
      
      logWithTimestamp(`${tokenAmount} HTT tokens transferred to account ${this.secondAccountId}`);
      
      this.secondAccountHbarBalance = hbarAmount;
      this.secondAccountTokenBalance = tokenAmount;
    } catch (error: unknown) {
      console.error(`Error setting up second account with tokens: ${(error as Error).message}`);
      throw error;
    }
  }
);

Given(
  /^A third Hedera account with (\d+) hbar and (\d+) HTT tokens$/,
  { timeout: 60000 },
  async function (this: TokenContext, hbarAmount: number, tokenAmount: number) {
    try {
      if (!this.tokenId1) {
        this.tokenId1 = this.tokenId_1; // Use tokenId_1 if tokenId1 is not set
      }
      
      if (!this.tokenId1) {
        throw new Error('Token ID is not defined');
      }
      
      // Create a new account with specified balance
      const { accountId, privateKey } = await createAccount(hbarAmount, 10);
      this.thirdAccountId = accountId;
      this.thirdAccountPrivateKey = privateKey;
      
      logWithTimestamp(`Third account created with ID: ${this.thirdAccountId}`);
      
      // Transfer tokens to the third account
      const transferTransaction = await createTokenTransfer(
        this.tokenId1,
        clientID,
        this.thirdAccountId,
        tokenAmount
      );
      
      await signAndExecuteTransaction(transferTransaction, clientPrivateKey, client);
      
      // Verify token balance
      const tokenBalance = await getTokenBalance(this.thirdAccountId, this.tokenId1);
      assert.strictEqual(tokenBalance, tokenAmount);
      
      logWithTimestamp(`${tokenAmount} HTT tokens transferred to account ${this.thirdAccountId}`);
      
      this.thirdAccountHbarBalance = hbarAmount;
      this.thirdAccountTokenBalance = tokenAmount;
    } catch (error: unknown) {
      console.error(`Error setting up third account with tokens: ${(error as Error).message}`);
      throw error;
    }
  }
);

Given(
  /^A fourth Hedera account with (\d+) hbar and (\d+) HTT tokens$/,
  { timeout: 60000 },
  async function (this: TokenContext, hbarAmount: number, tokenAmount: number) {
    try {
      if (!this.tokenId1) {
        this.tokenId1 = this.tokenId_1; // Use tokenId_1 if tokenId1 is not set
      }
      
      if (!this.tokenId1) {
        throw new Error('Token ID is not defined');
      }
      
      // Create a new account with specified balance
      const { accountId, privateKey } = await createAccount(hbarAmount, 10);
      this.fourthAccountId = accountId;
      this.fourthAccountPrivateKey = privateKey;
      
      logWithTimestamp(`Fourth account created with ID: ${this.fourthAccountId}`);
      
      // Transfer tokens to the fourth account
      const transferTransaction = await createTokenTransfer(
        this.tokenId1,
        clientID,
        this.fourthAccountId,
        tokenAmount
      );
      
      await signAndExecuteTransaction(transferTransaction, clientPrivateKey, client);
      
      // Verify token balance
      const tokenBalance = await getTokenBalance(this.fourthAccountId, this.tokenId1);
      assert.strictEqual(tokenBalance, tokenAmount);
      
      logWithTimestamp(`${tokenAmount} HTT tokens transferred to account ${this.fourthAccountId}`);
      
      this.fourthAccountHbarBalance = hbarAmount;
      this.fourthAccountTokenBalance = tokenAmount;
    } catch (error: unknown) {
      console.error(`Error setting up fourth account with tokens: ${(error as Error).message}`);
      throw error;
    }
  }
);

When(
  /^A transaction is created to transfer (\d+) HTT tokens out of the first and second account and (\d+) HTT tokens into the third account and (\d+) HTT tokens into the fourth account$/,
  async function (this: TokenContext, outAmount1: number, inAmount3: number, inAmount4: number) {
    try {
      if (!this.tokenId1 || !this.newAccountId || !this.secondAccountId || 
          !this.thirdAccountId || !this.fourthAccountId) {
        throw new Error('Required account IDs or token ID is not defined');
      }

      // Calculate how much to take from the second account to ensure the sums match
      const outAmount2 = inAmount3 + inAmount4 - outAmount1;

      logWithTimestamp(
        `Creating transaction: first account: -${outAmount1}, second account: -${outAmount2}, third account: +${inAmount3}, fourth account: +${inAmount4}`
      );

      // Create the multi-party transfer using our service
      const transfers = [
        { accountId: this.newAccountId, amount: -outAmount1 },
        { accountId: this.secondAccountId, amount: -outAmount2 },
        { accountId: this.thirdAccountId, amount: inAmount3 },
        { accountId: this.fourthAccountId, amount: inAmount4 }
      ];
      
      this.transferTransaction = await createMultiPartyTokenTransfer(this.tokenId1, transfers);

      if (!this.secondAccountPrivateKey) {
        throw new Error('Second account private key is not defined');
      }

      // Sign with the second account's key (multi-signature transaction)
      this.transferTransaction = await this.transferTransaction.sign(this.secondAccountPrivateKey);
      logWithTimestamp('Transaction created and signed by second account');
    } catch (error: unknown) {
      console.error(`Error creating multi-party transfer transaction: ${(error as Error).message}`);
      throw error;
    }
  }
);

Then(
  /^The third account holds (\d+) HTT tokens$/,
  async function (this: TokenContext, expectedAmount: number) {
    try {
      if (!this.thirdAccountId || !this.tokenId1) {
        throw new Error('Third account ID or token ID is not defined');
      }

      // Check the token balance using our service
      const tokenBalance = await getTokenBalance(this.thirdAccountId, this.tokenId1);
      
      logWithTimestamp(`Third account token balance: ${tokenBalance}`);
      assert.strictEqual(
        tokenBalance,
        expectedAmount,
        `Expected third account to hold ${expectedAmount} tokens, but got ${tokenBalance}`
      );
    } catch (error: unknown) {
      console.error(`Error verifying third account token balance: ${(error as Error).message}`);
      throw error;
    }
  }
);

Then(
  /^The fourth account holds (\d+) HTT tokens$/,
  async function (this: TokenContext, expectedAmount: number) {
    try {
      if (!this.fourthAccountId || !this.tokenId1) {
        throw new Error('Fourth account ID or token ID is not defined');
      }

      // Check the token balance using our service
      const tokenBalance = await getTokenBalance(this.fourthAccountId, this.tokenId1);
      
      logWithTimestamp(`Fourth account token balance: ${tokenBalance}`);
      assert.strictEqual(
        tokenBalance,
        expectedAmount,
        `Expected fourth account to hold ${expectedAmount} tokens, but got ${tokenBalance}`
      );
    } catch (error: unknown) {
      console.error(`Error verifying fourth account token balance: ${(error as Error).message}`);
      throw error;
    }
  }
);
