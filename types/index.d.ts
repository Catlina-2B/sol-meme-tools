import { Provider } from '@coral-xyz/anchor';
import { Connection, Keypair, Transaction, PublicKey } from '@solana/web3.js';

export interface CreateAndBuyParams {
  payer: Keypair;
  mint: Keypair;
  name: string;
  symbol: string;
  uri: string;
  buyAmount: string;
  slippageDecimal: number;
  rpcUrl: string;
}

export interface BuyParams {
  payer: Keypair;
  caAddr: string;
  buyAmount: string;
  slippageDecimal: number;
  rpcUrl: string;
}

export interface SellParams {
  payer: Keypair;
  caAddr: string;
  sellAmount: string;
  solPrice: string;
  slippageDecimal: number;
  rpcUrl: string;
}

export function createAndBuy(params: CreateAndBuyParams): Promise<unknown>;

export function buy(params: BuyParams): Promise<unknown>;

export function sell(params: SellParams): Promise<unknown>;

export function signTxAndSend(
  connection: Connection,
  transaction: Transaction,
  signers: Keypair[]
): Promise<unknown>;

export function buySPLInstructions(
  connection: Connection,
  provider: Provider,
  payer: Keypair,
  caAddr: string,
  buyAmount: string,
  slippageDecimal: number
): Promise<Transaction>;

export function sellSPLInstructions(
  provider: Provider,
  payer: Keypair,
  caAddr: string,
  sellAmount: string,
  solPrice: string,
  slippageDecimal: number
): Promise<Transaction>;
