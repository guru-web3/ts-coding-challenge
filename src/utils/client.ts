import { Client, AccountId, PrivateKey } from '@hashgraph/sdk';
import { accounts } from '../config';

// Initialize Hedera client for testnet
const client = Client.forTestnet();
const clientID = AccountId.fromString(accounts[0].id);
const clientPrivateKey = PrivateKey.fromStringED25519(accounts[0].privateKey);
client.setOperator(clientID, clientPrivateKey);

export { client, clientID, clientPrivateKey };
