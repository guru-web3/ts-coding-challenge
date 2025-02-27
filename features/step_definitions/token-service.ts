import { Given, Then, When } from "@cucumber/cucumber";
import { accounts } from "../../src/config";
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
} from "@hashgraph/sdk";
import assert from "node:assert";
import { Long } from "@hashgraph/sdk/lib/long";

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

interface BalanceApiResponse {
  timestamp: string;
  balances: Array<{
    account: string;
    balance: number;
    decimals: number;
  }>;
  links: {
    next: string | null;
  };
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
  transaction: TokenCreateTransaction | TokenMintTransaction | TransferTransaction, 
  signerKey: PrivateKey, 
  clientToUse: Client,
): Promise<TransactionReceipt> {
  try {
    const signedTx = await transaction.sign(signerKey);
    const txResponse = await signedTx.execute(clientToUse);
    const receipt = await txResponse.getReceipt(clientToUse);
    return receipt;
  } catch (error: unknown) {
    console.error(`Transaction signing/execution failed: ${(error as Error).message}`);
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
        throw new Error("Account ID or private key is not defined");
      }

      const transaction = await new TokenCreateTransaction()
        .setTokenName("Test Token")
        .setTokenSymbol("HTT")
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
        throw new Error("Token ID is null");
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
          "Token ID is not defined. Cannot fetch token information."
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
        throw new Error("Token ID is not defined");
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
        throw new Error("Token ID is not defined");
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
        throw new Error("Token ID or account ID is not defined");
      }

      const tokenInfo = await new TokenInfoQuery()
        .setTokenId(this.tokenId)
        .execute(client);

      if (tokenInfo.treasuryAccountId) {
        assert.strictEqual(
          tokenInfo.treasuryAccountId.toString(),
          this.account_id.toString(),
          "The token is not owned by the account"
        );

        // Store tokenId to tokenId1 before resetting
        this.tokenId1 = this.tokenId;
        delete this.tokenId;

        console.log(
          `Token ownership verified: treasury is ${tokenInfo.treasuryAccountId}`
        );
      } else {
        throw new Error("Token treasuryAccountId is null.");
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
        throw new Error("Token ID is not defined");
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
        "SUCCESS",
        "Minting failed."
      );
      console.log(`Successfully minted ${amount} tokens`);
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
        throw new Error("Account ID or private key is not defined");
      }

      const transaction = await new TokenCreateTransaction()
        .setTokenName("Test Token")
        .setTokenSymbol("HTT")
        .setDecimals(2)
        .setInitialSupply(supply)
        .setTreasuryAccountId(this.account_id)
        .freezeWith(client);

      const receipt = await signAndExecuteTransaction(
        transaction,
        this.privateKey,
        client
      );
      if (receipt.tokenId) {
        this.tokenId_fixed_supply = receipt.tokenId;
        this.tokenId = this.tokenId_fixed_supply;
      } else {
        throw new Error("Token ID is null");
      }
      console.log(
        `Fixed supply token created with ID: ${this.tokenId_fixed_supply.toString()}`
      );
    } catch (error: unknown) {
      console.error(
        `Error creating fixed supply token: ${(error as Error).message}`
      );
      throw error;
    }
  }
);

Then(
  /^The total supply of the token is (\d+)$/,
  async function (this: TokenContext, expectedSupply: number) {
    try {
      if (!this.tokenId_fixed_supply) {
        throw new Error("Token ID is not defined");
      }

      const tokenInfo = await new TokenInfoQuery()
        .setTokenId(this.tokenId_fixed_supply)
        .execute(client);
      assert.strictEqual(
        tokenInfo.totalSupply.toString(),
        expectedSupply.toString()
      );
      console.log(
        `Token total supply verified: ${tokenInfo.totalSupply.toString()}`
      );
    } catch (error: unknown) {
      console.error(
        `Error verifying token supply: ${(error as Error).message}`
      );
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
        throw new Error("Token ID or private key is not defined");
      }

      const mintTransaction = new TokenMintTransaction()
        .setTokenId(this.tokenId_fixed_supply)
        .setAmount(100)
        .freezeWith(client);

      const receipt = await signAndExecuteTransaction(
        mintTransaction,
        this.privateKey,
        client
      );
      assert.strictEqual(
        receipt.status.toString(),
        "TOKEN_SUPPLY_EXCEEDED",
        "Minting should have failed."
      );
      console.log("Minting attempt succeeded unexpectedly");
    } catch (error: unknown) {
      console.log("Minting attempt failed as expected:", error);
    }
  }
);

// Scenario 3: Transfer tokens between 2 accounts
Given(
  /^A first hedera account with more than (\d+) hbar$/,
  async function (this: TokenContext, expectedBalance: number) {
    try {
      // Generate a new ED25519 key pair
      const newAccountPrivateKey = PrivateKey.generateED25519();
      const newAccountPublicKey = newAccountPrivateKey.publicKey;

      // Create the account with an initial balance higher than the expected balance
      const initialBalance = expectedBalance + 10; // Add a margin for transaction fees

      const newAccountTransactionResponse = await new AccountCreateTransaction()
        .setKey(newAccountPublicKey)
        .setInitialBalance(Hbar.from(initialBalance, HbarUnit.Hbar))
        .setMaxAutomaticTokenAssociations(10)
        .execute(client);

      const getReceipt = await newAccountTransactionResponse.getReceipt(client);
      if (getReceipt.accountId) {
        this.firstAccountId = getReceipt.accountId;
      } else {
        throw new Error("Failed to create account: accountId is null");
      }

      // Check the account balance
      const accountBalance = await new AccountBalanceQuery()
        .setAccountId(this.firstAccountId)
        .execute(client);

      const balanceInHbar =
        accountBalance.hbars.toTinybars().toNumber() / 100_000_000;

      if (balanceInHbar <= expectedBalance) {
        throw new Error(
          `Account balance (${balanceInHbar} HBAR) is not greater than ${expectedBalance} HBAR`
        );
      }

      console.log(
        `Account created with ID: ${this.firstAccountId} and balance: ${balanceInHbar} HBAR`
      );

      // Store the private key for later use
      this.firstAccountPrivateKey = newAccountPrivateKey;
    } catch (error: unknown) {
      console.error(
        `Error creating first Hedera account: ${(error as Error).message}`
      );
      throw error;
    }
  }
);

Given(/^A second Hedera account$/, async function (this: TokenContext) {
  try {
    // Generate a new ED25519 key pair
    const newAccountPrivateKey = PrivateKey.generateED25519();
    const newAccountPublicKey = newAccountPrivateKey.publicKey;

    // Create the account with initial balance
    const newAccountTransactionResponse = await new AccountCreateTransaction()
      .setKey(newAccountPublicKey)
      .setInitialBalance(Hbar.from(10, HbarUnit.Hbar))
      .setMaxAutomaticTokenAssociations(10)
      .execute(client);

    const getReceipt = await newAccountTransactionResponse.getReceipt(client);
    if (getReceipt.accountId) {
      this.secondAccountId = getReceipt.accountId;
    } else {
      throw new Error("Failed to create second account: accountId is null");
    }

    console.log(`Second account created with ID: ${this.secondAccountId}`);

    // Store the private key for later use
    this.secondAccountPrivateKey = newAccountPrivateKey;
  } catch (error: unknown) {
    console.error(
      `Error creating second Hedera account: ${(error as Error).message}`
    );
    throw error;
  }
});

Given(
  /^A token named Test Token \(HTT\) with (\d+) tokens$/,
  async function (this: TokenContext, supply: number) {
    try {
      // Create a transaction for the token creation on the Hedera network
      const transaction = await new TokenCreateTransaction()
        .setTokenName("Test Token")
        .setTokenSymbol("HTT")
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(0)
        .setInitialSupply(supply)
        .setTreasuryAccountId(clientID)
        .setAdminKey(clientPrivateKey)
        .setSupplyKey(clientPrivateKey)
        .freezeWith(client);

      // Sign the transaction with the client's private key
      const receipt = await signAndExecuteTransaction(
        transaction,
        clientPrivateKey,
        client
      );

      // Get the created token ID and store it
      this.tokenId_1 = receipt.tokenId!;

      // Check the client's balance after associations
      const balance = await new AccountBalanceQuery()
        .setAccountId(clientID)
        .execute(client);

      // Check if balance.tokens is not null before accessing the balance
      const tokenBalance = balance.tokens
        ? balance.tokens.get(this.tokenId_1) || 0
        : 0;

      console.log(`Account ${clientID} balance: ${tokenBalance} tokens`);
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
        throw new Error("First account ID or token ID is not defined");
      }

      // Check initial balance
      const balance = await new AccountBalanceQuery()
        .setAccountId(this.firstAccountId)
        .execute(client);

      let tokenBalance = balance.tokens?.get(this.tokenId_1)?.toNumber() || 0;

      // If the balance is not as expected, perform the transfer
      if (tokenBalance !== expectedAmount) {
        const transferTransaction = new TransferTransaction()
          .addTokenTransfer(this.tokenId_1, clientID, -expectedAmount)
          .addTokenTransfer(this.tokenId_1, this.firstAccountId, expectedAmount)
          .freezeWith(client);

        await signAndExecuteTransaction(
          transferTransaction,
          clientPrivateKey,
          client
        );
      }

      // Check final balance
      tokenBalance =
        (
          await new AccountBalanceQuery()
            .setAccountId(this.firstAccountId)
            .execute(client)
        ).tokens
          ?.get(this.tokenId_1)
          ?.toNumber() || 0;

      assert.strictEqual(tokenBalance, expectedAmount);
      console.log(`First account now holds ${tokenBalance} HTT tokens`);
    } catch (error: unknown) {
      console.error(
        `Error setting first account token balance: ${(error as Error).message}`
      );
      throw error;
    }
  }
);

Given(
  /^The second account holds (\d+) HTT tokens$/,
  async function (this: TokenContext, expectedAmount: number) {
    try {
      if (!this.secondAccountId || !this.tokenId_1) {
        throw new Error("Second account ID or token ID is not defined");
      }

      // Check initial balance of the second account
      const balance = await new AccountBalanceQuery()
        .setAccountId(this.secondAccountId)
        .execute(client);

      let tokenBalance = balance.tokens?.get(this.tokenId_1)?.toNumber() || 0;

      // If the balance is not as expected, perform the transfer
      if (tokenBalance !== expectedAmount) {
        const transferTransaction = new TransferTransaction()
          .addTokenTransfer(this.tokenId_1, clientID, -expectedAmount)
          .addTokenTransfer(
            this.tokenId_1,
            this.secondAccountId,
            expectedAmount
          )
          .freezeWith(client);

        await signAndExecuteTransaction(
          transferTransaction,
          clientPrivateKey,
          client
        );
      }

      // Check final balance of the second account
      tokenBalance =
        (
          await new AccountBalanceQuery()
            .setAccountId(this.secondAccountId)
            .execute(client)
        ).tokens
          ?.get(this.tokenId_1)
          ?.toNumber() || 0;

      assert.strictEqual(tokenBalance, expectedAmount);
      console.log(`Second account now holds ${tokenBalance} HTT tokens`);
    } catch (error: unknown) {
      console.error(
        `Error setting second account token balance: ${
          (error as Error).message
        }`
      );
      throw error;
    }
  }
);

When(
  /^The first account creates a transaction to transfer (\d+) HTT tokens to the second account$/,
  async function (this: TokenContext, amount: number) {
    try {
      if (!this.firstAccountId || !this.secondAccountId || !this.tokenId_1) {
        throw new Error("Account IDs or token ID is not defined");
      }

      // Create a transfer transaction to transfer tokens from the first account to the second
      this.transferTransaction = new TransferTransaction()
        .addTokenTransfer(this.tokenId_1, this.firstAccountId, -amount)
        .addTokenTransfer(this.tokenId_1, this.secondAccountId, amount)
        .freezeWith(client);

      console.log(
        `Transaction created to transfer ${amount} HTT tokens from first to second account`
      );
    } catch (error: unknown) {
      console.error(
        `Error creating transfer transaction: ${(error as Error).message}`
      );
      throw error;
    }
  }
);

When(
  /^The first account submits the transaction$/,
  async function (this: TokenContext) {
    try {
      if (!this.transferTransaction) {
        throw new Error("No transfer transaction has been created");
      }

      if (!this.firstAccountPrivateKey && !this.newAccountPrivateKey) {
        throw new Error("First account private key is not defined");
      }

      // Sign with the first account's private key
      const privateKey = this.firstAccountPrivateKey || this.newAccountPrivateKey;

      const receipt = await signAndExecuteTransaction(
        this.transferTransaction,
        privateKey!!,
        client
      );
      assert.strictEqual(
        receipt.status.toString(),
        "SUCCESS",
        "Transaction failed"
      );
    } catch (error: unknown) {
      console.error(
        `Error submitting transaction: ${(error as Error).message}`
      );
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
        throw new Error("Account IDs or token ID is not defined");
      }

      // Check Hbar balance of the first account before the transfer
      const initialBalance = await new AccountBalanceQuery()
        .setAccountId(this.firstAccountId)
        .execute(client);

      // Store the Hbar balance of the first account in 'this'
      this.initialHbarBalance = initialBalance.hbars.toTinybars();
      console.log(
        `Initial Hbar balance of the first account: ${this.initialHbarBalance.toString()}`
      );

      // Second account creates the transfer transaction
      this.transferTransaction = new TransferTransaction()
        .addTokenTransfer(this.tokenId_1, this.secondAccountId, -amount)
        .addTokenTransfer(this.tokenId_1, this.firstAccountId, amount)
        .freezeWith(client);

      // Sign the transaction with the second account's key
      if (!this.secondAccountPrivateKey) {
        throw new Error("Second account private key is not defined");
      }

      this.transferTransaction = await this.transferTransaction.sign(
        this.secondAccountPrivateKey
      );
      console.log(
        `Transaction created by second account to transfer ${amount} HTT tokens to first account`
      );
    } catch (error: unknown) {
      console.error(
        `Error creating transfer transaction from second account: ${
          (error as Error).message
        }`
      );
      throw error;
    }
  }
);

Then(
  /^The first account has paid for the transaction fee$/,
  async function (this: TokenContext) {
    try {
      if (!this.firstAccountId || !this.initialHbarBalance) {
        throw new Error(
          "First account ID or initial Hbar balance is not defined"
        );
      }

      // Check the current Hbar balance of the first account
      const finalBalance = await new AccountBalanceQuery()
        .setAccountId(this.firstAccountId)
        .execute(client);

      const finalHbarBalance = finalBalance.hbars.toTinybars();

      console.log(
        `Final Hbar balance of the first account: ${finalHbarBalance.toString()}`
      );

      assert.strictEqual(
        finalHbarBalance.toString(),
        this.initialHbarBalance.toString(),
        "The first account has not paid for the transaction fee"
      );

      console.log("First account has paid for the transaction fee");
    } catch (error: unknown) {
      console.error(
        `Error verifying transaction fee payment: ${(error as Error).message}`
      );
      throw error;
    }
  }
);

// Scenario 5: Create a multi party token transfer transaction
Given(
  /^A first hedera account with more than (\d+) hbar and (\d+) HTT tokens$/,
  { timeout: 60000 },
  async function (
    this: TokenContext,
    expectedAmount1: number,
    expectedAmount2: number
  ) {
    try {
      this.tokenId1 = this.tokenId_1;
      if (!this.tokenId1) {
        throw new Error("Token ID is not defined");
      }

      // Generate a new ED25519 key pair
      const newAccountPrivateKey = PrivateKey.generateED25519();
      const newAccountPublicKey = newAccountPrivateKey.publicKey;

      // Create a new account with token auto-association
      const newAccount = await new AccountCreateTransaction()
        .setKey(newAccountPublicKey)
        .setInitialBalance(Hbar.from(expectedAmount1 + 1, HbarUnit.Hbar))
        .setMaxAutomaticTokenAssociations(10)
        .execute(client);

      // Get the receipt to retrieve the new account ID
      const receipt = await newAccount.getReceipt(client);
      if (receipt.accountId) {
        this.newAccountId = receipt.accountId;
      } else {
        throw new Error("Failed to create account: accountId is null");
      }
      this.firstAccountId = this.newAccountId;

      console.log(`New account created with ID: ${this.newAccountId}`);

      // Transfer tokens from the client account to the new account
      const tokenTransfer = await new TransferTransaction()
        .addTokenTransfer(this.tokenId1, clientID, -expectedAmount2)
        .addTokenTransfer(this.tokenId1, this.newAccountId, expectedAmount2)
        .freezeWith(client)
        .sign(clientPrivateKey);

      // Execute the transfer transaction
      const tokenTransferSubmit = await tokenTransfer.execute(client);

      // Get the transaction receipt
      const transferReceipt = await tokenTransferSubmit.getReceipt(client);

      console.log(
        `${expectedAmount2} tokens transferred to account ${this.newAccountId}`
      );

      this.clientId = clientID;
      this.client = client;

      // Store important information in the context for later use
      this.newAccountPrivateKey = newAccountPrivateKey;
      this.expectedHbarBalance = expectedAmount1;
      this.expectedTokenBalance = expectedAmount2;
      this.firstAccountPrivateKey = newAccountPrivateKey;
    } catch (error: unknown) {
      console.error(
        `Error setting up first account with tokens: ${
          (error as Error).message
        }`
      );
      throw error;
    }
  }
);

Given(
  /^A second Hedera account with (\d+) hbar and (\d+) HTT tokens$/,
  { timeout: 60000 },
  async function (this: TokenContext, hbarAmount: number, tokenAmount: number) {
    try {
      if (!this.tokenId1 || !this.client) {
        this.tokenId1 = this.tokenId_1; // Use tokenId_1 if tokenId1 is not set
        this.client = client;
      }

      if (!this.tokenId1) {
        throw new Error("Token ID is not defined");
      }

      // Create a new ED25519 key pair
      const secondAccountPrivateKey = PrivateKey.generateED25519();
      const secondAccountPublicKey = secondAccountPrivateKey.publicKey;

      // Create a new account with token auto-association
      const newAccountTx = await new AccountCreateTransaction()
        .setKey(secondAccountPublicKey)
        .setInitialBalance(Hbar.from(hbarAmount, HbarUnit.Hbar))
        .setMaxAutomaticTokenAssociations(10)
        .execute(client);

      // Get the receipt to retrieve the new account ID
      const receipt = await newAccountTx.getReceipt(client);
      if (receipt.accountId) {
        this.secondAccountId = receipt.accountId;
      } else {
        throw new Error("Failed to create second account: accountId is null");
      }

      console.log(`Second account created with ID: ${this.secondAccountId}`);

      // Transfer HTT tokens from the client account to the new account
      const tokenTransferTx = await new TransferTransaction()
        .addTokenTransfer(this.tokenId1, clientID, -tokenAmount)
        .addTokenTransfer(this.tokenId1, this.secondAccountId, tokenAmount)
        .execute(client);

      // Wait for the transfer receipt
      await tokenTransferTx.getReceipt(client);

      console.log(
        `${tokenAmount} HTT tokens transferred to account ${this.secondAccountId}`
      );

      // Store important information in the context for later use
      this.secondAccountPrivateKey = secondAccountPrivateKey;
      this.secondAccountHbarBalance = hbarAmount;
      this.secondAccountTokenBalance = tokenAmount;
    } catch (error: unknown) {
      console.error(
        `Error setting up second account with tokens: ${
          (error as Error).message
        }`
      );
      throw error;
    }
  }
);

Given(
  /^A third Hedera account with (\d+) hbar and (\d+) HTT tokens$/,
  { timeout: 60000 },
  async function (this: TokenContext, hbarAmount: number, tokenAmount: number) {
    try {
      if (!this.tokenId1 || !this.client) {
        this.tokenId1 = this.tokenId_1; // Use tokenId_1 if tokenId1 is not set
        this.client = client;
      }

      if (!this.tokenId1) {
        throw new Error("Token ID is not defined");
      }

      // Create a new ED25519 key pair
      const thirdAccountPrivateKey = PrivateKey.generateED25519();
      const thirdAccountPublicKey = thirdAccountPrivateKey.publicKey;

      // Create a new account with token auto-association
      const newAccountTx = await new AccountCreateTransaction()
        .setKey(thirdAccountPublicKey)
        .setInitialBalance(Hbar.from(hbarAmount, HbarUnit.Hbar))
        .setMaxAutomaticTokenAssociations(10)
        .execute(client);

      // Get the receipt to retrieve the new account ID
      const receipt = await newAccountTx.getReceipt(client);
      if (receipt.accountId) {
        this.thirdAccountId = receipt.accountId;
      } else {
        throw new Error("Failed to create account: accountId is null");
      }

      console.log(`Third account created with ID: ${this.thirdAccountId}`);

      // Transfer HTT tokens from the client account to the new account
      const tokenTransferTx = await new TransferTransaction()
        .addTokenTransfer(this.tokenId1, clientID, -tokenAmount)
        .addTokenTransfer(this.tokenId1, this.thirdAccountId, tokenAmount)
        .execute(client);

      // Wait for the transfer receipt
      await tokenTransferTx.getReceipt(client);

      console.log(
        `${tokenAmount} HTT tokens transferred to account ${this.thirdAccountId}`
      );

      // Store important information in the context for later use
      this.thirdAccountPrivateKey = thirdAccountPrivateKey;
      this.thirdAccountHbarBalance = hbarAmount;
      this.thirdAccountTokenBalance = tokenAmount;
    } catch (error: unknown) {
      console.error(
        `Error setting up third account with tokens: ${
          (error as Error).message
        }`
      );
      throw error;
    }
  }
);

Given(
  /^A fourth Hedera account with (\d+) hbar and (\d+) HTT tokens$/,
  { timeout: 60000 },
  async function (this: TokenContext, hbarAmount: number, tokenAmount: number) {
    try {
      if (!this.tokenId1 || !this.client) {
        this.tokenId1 = this.tokenId_1; // Use tokenId_1 if tokenId1 is not set
        this.client = client;
      }

      if (!this.tokenId1) {
        throw new Error("Token ID is not defined");
      }

      // Create a new ED25519 key pair
      const fourthAccountPrivateKey = PrivateKey.generateED25519();
      const fourthAccountPublicKey = fourthAccountPrivateKey.publicKey;

      // Create a new account with token auto-association
      const newAccountTx = await new AccountCreateTransaction()
        .setKey(fourthAccountPublicKey)
        .setInitialBalance(Hbar.from(hbarAmount, HbarUnit.Hbar))
        .setMaxAutomaticTokenAssociations(10)
        .execute(client);

      // Get the receipt to retrieve the new account ID
      const receipt = await newAccountTx.getReceipt(client);
      if (receipt.accountId) {
        this.fourthAccountId = receipt.accountId;
      } else {
        throw new Error("Failed to create fourth account: accountId is null");
      }

      console.log(`Fourth account created with ID: ${this.fourthAccountId}`);

      // Transfer HTT tokens from the client account to the new account
      const tokenTransferTx = await new TransferTransaction()
        .addTokenTransfer(this.tokenId1, clientID, -tokenAmount)
        .addTokenTransfer(this.tokenId1, this.fourthAccountId, tokenAmount)
        .execute(client);

      // Wait for the transfer receipt
      await tokenTransferTx.getReceipt(client);

      console.log(
        `${tokenAmount} HTT tokens transferred to account ${this.fourthAccountId}`
      );

      // Store important information in the context for later use
      this.fourthAccountPrivateKey = fourthAccountPrivateKey;
      this.fourthAccountHbarBalance = hbarAmount;
      this.fourthAccountTokenBalance = tokenAmount;
    } catch (error: unknown) {
      console.error(
        `Error setting up fourth account with tokens: ${
          (error as Error).message
        }`
      );
      throw error;
    }
  }
);

When(
  /^A transaction is created to transfer (\d+) HTT tokens out of the first and second account and (\d+) HTT tokens into the third account and (\d+) HTT tokens into the fourth account$/,
  async function (
    this: TokenContext,
    outAmount1: number,
    inAmount3: number,
    inAmount4: number
  ) {
    try {
      if (
        !this.tokenId1 ||
        !this.newAccountId ||
        !this.secondAccountId ||
        !this.thirdAccountId ||
        !this.fourthAccountId
      ) {
        throw new Error("Required account IDs or token ID is not defined");
      }

      // Calculate how much to take from the second account to ensure the sums match
      const outAmount2 = inAmount3 + inAmount4 - outAmount1;

      console.log(
        `Creating transaction: first account: -${outAmount1}, second account: -${outAmount2}, third account: +${inAmount3}, fourth account: +${inAmount4}`
      );

      // Create the transaction with all token transfers
      this.transferTransaction = new TransferTransaction()
        .addTokenTransfer(this.tokenId1, this.newAccountId, -outAmount1)
        .addTokenTransfer(this.tokenId1, this.secondAccountId, -outAmount2)
        .addTokenTransfer(this.tokenId1, this.thirdAccountId, inAmount3)
        .addTokenTransfer(this.tokenId1, this.fourthAccountId, inAmount4)
        .freezeWith(client);

      if (!this.secondAccountPrivateKey) {
        throw new Error("Second account private key is not defined");
      }

      // Sign with the second account's key (multi-signature transaction)
      this.transferTransaction = await this.transferTransaction.sign(
        this.secondAccountPrivateKey
      );
      console.log("Transaction created and signed by second account");
    } catch (error: unknown) {
      console.error(
        `Error creating multi-party transfer transaction: ${
          (error as Error).message
        }`
      );
      throw error;
    }
  }
);

Then(
  /^The third account holds (\d+) HTT tokens$/,
  async function (this: TokenContext, expectedAmount: number) {
    try {
      if (!this.thirdAccountId || !this.tokenId1) {
        throw new Error("Third account ID or token ID is not defined");
      }

      // Check the token balance of the third account
      const accountBalance = await new AccountBalanceQuery()
        .setAccountId(this.thirdAccountId)
        .execute(client);

      if (!accountBalance.tokens) {
        throw new Error("No token balance found for the third account");
      }

      const tokenBalance =
        accountBalance.tokens.get(this.tokenId1)?.toNumber() || 0;

      console.log(`Third account token balance: ${tokenBalance}`);
      assert.strictEqual(
        tokenBalance,
        expectedAmount,
        `Expected third account to hold ${expectedAmount} tokens, but got ${tokenBalance}`
      );
    } catch (error: unknown) {
      console.error(
        `Error verifying third account token balance: ${
          (error as Error).message
        }`
      );
      throw error;
    }
  }
);

Then(
  /^The fourth account holds (\d+) HTT tokens$/,
  async function (this: TokenContext, expectedAmount: number) {
    try {
      if (!this.fourthAccountId || !this.tokenId1) {
        throw new Error("Fourth account ID or token ID is not defined");
      }

      // Check the token balance of the fourth account
      const accountBalance = await new AccountBalanceQuery()
        .setAccountId(this.fourthAccountId)
        .execute(client);

      if (!accountBalance.tokens) {
        throw new Error("No token balance found for the fourth account");
      }

      const tokenBalance =
        accountBalance.tokens.get(this.tokenId1)?.toNumber() || 0;

      console.log(`Fourth account token balance: ${tokenBalance}`);
      assert.strictEqual(
        tokenBalance,
        expectedAmount,
        `Expected fourth account to hold ${expectedAmount} tokens, but got ${tokenBalance}`
      );
    } catch (error: unknown) {
      console.error(
        `Error verifying fourth account token balance: ${
          (error as Error).message
        }`
      );
      throw error;
    }
  }
);
