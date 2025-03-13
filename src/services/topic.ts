import {
  KeyList,
  PrivateKey,
  TopicCreateTransaction,
  TopicId,
  TopicMessage,
  TopicMessageQuery,
  TopicMessageSubmitTransaction,
  Timestamp,
  Hbar,
  AccountCreateTransaction,
  Status,
  AccountId,
} from '@hashgraph/sdk';
import { client } from '../utils/client';
import { logWithTimestamp } from '../utils/helpers';

/**
 * Creates a new topic with the specified memo and submit key
 */
export async function createTopic(
  memo: string,
  submitKey: PrivateKey | KeyList
): Promise<TopicId | null> {
  try {
    const transaction = new TopicCreateTransaction()
      .setTopicMemo(memo)
      .setSubmitKey(
        submitKey instanceof PrivateKey ? submitKey.publicKey : submitKey
      );

    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    return receipt.topicId;
  } catch (error: unknown) {
    logWithTimestamp(`Topic creation failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Publishes a message to the specified topic
 */
export async function publishMessage(
  topicId: TopicId,
  message: string
): Promise<Timestamp | null> {
  try {
    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(message);

    const txResponse = await transaction.execute(client);
    await txResponse.getReceipt(client);

    return txResponse.transactionId.validStart;
  } catch (error: unknown) {
    logWithTimestamp(`Message publishing failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Subscribes to a topic and waits for a specific message
 */
export async function waitForMessage(
  topicId: TopicId,
  expectedMessage: string,
  startTime: Timestamp | Date,
  timeoutMs: number = 30000
): Promise<string> {
  try {
    return await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for message'));
      }, timeoutMs);

      const subscription = new TopicMessageQuery()
        .setTopicId(topicId)
        .setStartTime(startTime)
        .subscribe(
          client,
          (error) => {
            clearTimeout(timeout);
            reject(error);
          },
          (message: TopicMessage) => {
            const receivedMsg = Buffer.from(message.contents).toString('utf8');
            logWithTimestamp(
              `${message.consensusTimestamp.toDate()} Received: ${receivedMsg}`
            );

            if (receivedMsg === expectedMessage) {
              clearTimeout(timeout);
              subscription.unsubscribe();
              resolve(receivedMsg);
            }
          }
        );
    });
  } catch (error: unknown) {
    logWithTimestamp(`Message reception failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Creates a new account with the specified private key and initial balance
 */
export async function createAccount(
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
    logWithTimestamp(`Account creation failed: ${(error as Error).message}`);
    throw error;
  }
}
