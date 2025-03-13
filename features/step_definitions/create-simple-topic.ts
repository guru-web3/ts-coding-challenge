import { Given, Then, When } from '@cucumber/cucumber';
import {
  AccountId,
  Hbar,
  KeyList,
  PrivateKey,
  TopicId,
  Timestamp
} from '@hashgraph/sdk';
import assert from 'node:assert';
import {  verifyAccountBalance } from '../../src/services/accountService';
import { createTopic, publishMessage, waitForMessage , createAccount } from '../../src/services/topic';
import { client, clientID, clientPrivateKey } from '../../src/utils/client';
import { logWithTimestamp } from '../../src/utils/helpers';

// Define interface for the test context to improve type safety
interface TopicContext {
  account: AccountId;
  privKey: PrivateKey;
  secondAccount?: AccountId;
  secondAccountKey?: PrivateKey;
  thresholdKey?: KeyList;
  topicId?: TopicId | null;
  messageTimestamp?: Timestamp | null;
}

// Step definitions
Given(
  /^a first account with more than (\d+) hbars$/,
  async function (this: TopicContext, expectedBalance: number) {
    try {
      // Use the default account from config
      this.account = clientID;
      this.privKey = clientPrivateKey;

      // Set the operator for the client
      client.setOperator(this.account, this.privKey);

      // Verify the account has sufficient balance
      const balance = await verifyAccountBalance(this.account, expectedBalance);
      logWithTimestamp(`Using account ${this.account.toString()} with ${balance} HBAR`);
    } catch (error: unknown) {
      logWithTimestamp(`Error setting up first account: ${(error as Error).message}`);
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
      logWithTimestamp(
        `Second account created with ID: ${secondAccountId.toString()}, status ${accountStatus} and initial balance of ${initialBalance.toString()}`
      );

      // Verify the balance
      await verifyAccountBalance(secondAccountId, expectedBalance);
    } catch (error: unknown) {
      logWithTimestamp(`Error setting up second account: ${(error as Error).message}`);
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
        throw new Error(`This step is designed for 2 keys, but ${totalKeys} were specified`);
      }

      // Ensure both account keys are available
      if (!this.privKey || !this.secondAccountKey) {
        throw new Error('Keys for both first and second accounts must be set before this step');
      }

      // Create the key list
      const keyList = [this.privKey.publicKey, this.secondAccountKey.publicKey];

      // Create the threshold key
      this.thresholdKey = new KeyList(keyList, threshold);
      logWithTimestamp(`Threshold key ${threshold}/${totalKeys} created successfully`);
    } catch (error: unknown) {
      logWithTimestamp(`Error creating threshold key: ${(error as Error).message}`);
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

      // Create a new topic using the service
      this.topicId = await createTopic(memo, this.privKey);
      
      logWithTimestamp(`Created topic with ID: ${this.topicId?.toString()} and memo: "${memo}"`);
    } catch (error: unknown) {
      logWithTimestamp(`Error creating topic with first account: ${(error as Error).message}`);
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

      // Create a new topic using the service
      this.topicId = await createTopic(memo, this.thresholdKey);
      
      logWithTimestamp(`Topic created with ID: ${this.topicId?.toString()} and memo: "${memo}"`);
    } catch (error: unknown) {
      logWithTimestamp(`Error creating topic with threshold key: ${(error as Error).message}`);
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

      // Publish message using the service
      this.messageTimestamp = await publishMessage(this.topicId, message);
      
      logWithTimestamp(`Message published to topic at ${this.messageTimestamp?.toString()}`);
    } catch (error: unknown) {
      logWithTimestamp(`Error publishing message to topic: ${(error as Error).message}`);
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

      // Wait for message using the service
      const receivedMessage = await waitForMessage(
        this.topicId,
        expectedMessage,
        startTime,
        timeoutMs
      );

      logWithTimestamp(`Successfully received expected message: "${receivedMessage}"`);
      assert.strictEqual(receivedMessage, expectedMessage);
    } catch (error: unknown) {
      logWithTimestamp(`Error receiving message: ${(error as Error).message}`);
      throw error;
    }
  }
);
