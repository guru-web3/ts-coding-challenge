import { Given, Then, When } from '@cucumber/cucumber';
import {
  AccountBalanceQuery,
  AccountCreateTransaction,
  AccountId,
  Client,
  Hbar,
  KeyList,
  PrivateKey,
  TopicCreateTransaction,
  TopicMessageQuery,
  TopicMessageSubmitTransaction,
  TopicMessage,
  Timestamp,
  TopicId,
  Status,
} from '@hashgraph/sdk';
import { accounts } from '../../src/config';
import assert from 'node:assert';

// Define interface for the test context to improve type safety
interface TopicContext {
  account?: AccountId;
  privKey?: PrivateKey;
  secondAccount?: AccountId;
  secondAccountKey?: PrivateKey;
  thresholdKey?: KeyList;
  topicId?: TopicId | null; // Using 'any' as TopicId isn't clearly imported in original code
  messageTimestamp?: Timestamp | null; // Same reason as above
}

// Pre-configured client for test network (testnet)
const client = Client.forTestnet();

/**
 * Utility function to create a new account
 * @param privateKey - The private key for the new account
 * @param initialBalance - The initial balance for the new account
 * @returns An array containing [status, accountId]
 */
async function createAccount(
  privateKey: PrivateKey,
  initialBalance: Hbar
): Promise<[Status, AccountId | null]> {
  try {
    const transaction = new AccountCreateTransaction()
      .setKey(privateKey.publicKey)
      .setInitialBalance(initialBalance);

    const response = await transaction.execute(client);
    const receipt = await response.getReceipt(client);

    return [receipt.status, receipt.accountId];
  } catch (error: unknown) {
    console.error(`Account creation failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Utility function to check account balance
 * @param accountId - The account ID to check balance for
 * @param expectedMinimum - The minimum expected balance
 * @returns The actual balance in hbars
 */
async function verifyAccountBalance(
  accountId: AccountId,
  expectedMinimum: number
): Promise<number> {
  try {
    const query = new AccountBalanceQuery().setAccountId(accountId);
    const balance = await query.execute(client);
    const balanceValue = balance.hbars.toBigNumber().toNumber();

    assert.ok(
      balanceValue > expectedMinimum,
      `Account balance (${balanceValue}) is not greater than ${expectedMinimum} HBAR`
    );

    return balanceValue;
  } catch (error: unknown) {
    console.error(`Balance verification failed: ${(error as Error).message}`);
    throw error;
  }
}

// Step definitions
Given(
  /^a first account with more than (\d+) hbars$/,
  async function (this: TopicContext, expectedBalance: number) {
    try {
      const acc = accounts[0];
      const account = AccountId.fromString(acc.id);
      const privKey = PrivateKey.fromStringED25519(acc.privateKey);

      // Set the account and key in the context
      this.account = account;
      this.privKey = privKey;

      // Set the operator for the client
      client.setOperator(account, privKey);

      // Verify the account has sufficient balance
      const balance = await verifyAccountBalance(account, expectedBalance);
      console.log(`Using account ${account.toString()} with ${balance} HBAR`);
    } catch (error: unknown) {
      console.error(
        `Error setting up first account: ${(error as Error).message}`
      );
      throw error;
    }
  }
);

Given(
  /^A second account with more than (\d+) hbars$/,
  async function (this: TopicContext, expectedBalance: number) {
    try {
      // Generate a new key for the second account
      const secondAccountKey = PrivateKey.generateED25519();

      // Create the account with slightly more than the expected balance
      const initialBalance = new Hbar(expectedBalance + 1);
      const [accountStatus, secondAccountId] = await createAccount(
        secondAccountKey,
        initialBalance
      );

      // Verify the account was created correctly
      if (!secondAccountId || !(secondAccountId instanceof AccountId)) {
        throw new Error('Failed to create second account properly');
      }

      // Store account info in the context
      this.secondAccount = secondAccountId;
      this.secondAccountKey = secondAccountKey;

      // Log account details
      console.log(
        `Second account created with ID: ${secondAccountId.toString()}, status ${accountStatus} and initial balance of ${initialBalance.toString()}`
      );

      // Verify the balance
      await verifyAccountBalance(secondAccountId, expectedBalance);
    } catch (error: unknown) {
      console.error(
        `Error setting up second account: ${(error as Error).message}`
      );
      throw error;
    }
  }
);

Given(
  /^A (\d+) of (\d+) threshold key with the first and second account$/,
  async function (this: TopicContext, threshold: number, totalKeys: number) {
    try {
      // Validate inputs
      if (totalKeys !== 2) {
        throw new Error(
          `This step is designed for 2 keys, but ${totalKeys} were specified`
        );
      }

      // Ensure both account keys are available
      if (!this.privKey || !this.secondAccountKey) {
        throw new Error(
          'Keys for both first and second accounts must be set before this step'
        );
      }

      // Create the key list
      const keyList = [this.privKey.publicKey, this.secondAccountKey.publicKey];

      // Create the threshold key
      this.thresholdKey = new KeyList(keyList, threshold);
      console.log(
        `Threshold key ${threshold}/${totalKeys} created successfully`
      );
    } catch (error: unknown) {
      console.error(
        `Error creating threshold key: ${(error as Error).message}`
      );
      throw error;
    }
  }
);

When(
  /^A topic is created with the memo "([^"]*)" with the first account as the submit key$/,
  async function (this: TopicContext, memo: string) {
    try {
      if (!this.privKey) {
        throw new Error('First account private key is not defined');
      }

      // Create a new topic
      const transaction = new TopicCreateTransaction()
        .setTopicMemo(memo)
        .setSubmitKey(this.privKey.publicKey);

      // Sign and execute the transaction
      const txResponse = await transaction.execute(client);

      // Get the receipt and topic ID
      const receipt = await txResponse.getReceipt(client);
      this.topicId = receipt.topicId;

      console.log(
        `Created topic with ID: ${this.topicId?.toString()} and memo: "${memo}"`
      );
    } catch (error: unknown) {
      console.error(
        `Error creating topic with first account: ${(error as Error).message}`
      );
      throw error;
    }
  }
);

When(
  /^A topic is created with the memo "([^"]*)" with the threshold key as the submit key$/,
  async function (this: TopicContext, memo: string) {
    try {
      // Validate that threshold key exists
      if (!this.thresholdKey) {
        throw new Error('Threshold key must be created before this step');
      }

      // Create the topic transaction
      const transaction = new TopicCreateTransaction()
        .setTopicMemo(memo)
        .setSubmitKey(this.thresholdKey);

      // Execute the transaction
      const txResponse = await transaction.execute(client);
      const receipt = await txResponse.getReceipt(client);
      this.topicId = receipt.topicId;

      console.log(
        `Topic created with ID: ${this.topicId?.toString()} and memo: "${memo}"`
      );
    } catch (error: unknown) {
      console.error(
        `Error creating topic with threshold key: ${(error as Error).message}`
      );
      throw error;
    }
  }
);

When(
  /^The message "([^"]*)" is published to the topic$/,
  async function (this: TopicContext, message: string) {
    try {
      if (!this.topicId) {
        throw new Error('Topic ID is not defined');
      }

      // Create and execute the message transaction
      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(this.topicId)
        .setMessage(message);

      const txResponse = await transaction.execute(client);
      const receipt = await txResponse.getReceipt(client);

      console.log(`Message transaction status: ${receipt.status.toString()}`);

      // Store the timestamp for later verification
      this.messageTimestamp = txResponse.transactionId.validStart;
    } catch (error: unknown) {
      console.error(
        `Error publishing message to topic: ${(error as Error).message}`
      );
      throw error;
    }
  }
);

Then(
  /^The message "([^"]*)" is received by the topic and can be printed to the console$/,
  async function (this: TopicContext, expectedMessage: string) {
    const timeoutMs = 30000; // 30 seconds timeout
    const startTime = this.messageTimestamp || new Date();

    try {
      if (!this.topicId) {
        throw new Error('Topic ID is not defined');
      }

      // Use promise to handle async message receiving with timeout
      const receivedMessage = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for message'));
        }, timeoutMs);

        // Create the subscription with proper handlers
        const subscription = new TopicMessageQuery()
          .setTopicId(this.topicId!)
          .setStartTime(startTime)
          .subscribe(
            client,
            (error) => {
              clearTimeout(timeout);
              reject(error);
            },
            (message: TopicMessage) => {
              const receivedMsg = Buffer.from(message.contents).toString(
                'utf8'
              );
              console.log(
                `${message.consensusTimestamp.toDate()} Received: ${receivedMsg}`
              );

              if (receivedMsg === expectedMessage) {
                clearTimeout(timeout);
                subscription.unsubscribe(); // Clean up the subscription
                resolve(receivedMsg);
              }
            }
          );
      });

      console.log(
        `Successfully received expected message: "${receivedMessage}"`
      );
      assert.strictEqual(receivedMessage, expectedMessage);
    } catch (error: unknown) {
      console.error(`Error receiving message: ${(error as Error).message}`);
      throw error;
    }
  }
);
