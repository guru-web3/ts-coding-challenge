import {
  Transaction,
  PrivateKey,
  Client,
  TransactionReceipt,
} from '@hashgraph/sdk';

/**
 * Utility function to sign and execute a transaction
 */
export async function signAndExecuteTransaction(
  transaction: Transaction,
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
 * Utility function to log with timestamp
 */
export function logWithTimestamp(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}
