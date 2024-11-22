import { AnchorProvider, Wallet, Provider } from '@coral-xyz/anchor';
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction,
  ComputeBudgetProgram
} from '@solana/web3.js';
import {
  buyInstructions,
  createSPLInstruction,
  sellInstructions
} from './pump';

import { getGlobalAccount } from './swap';

import { PUMP_FEE_RECEIPENT } from '../const';

import BigNumber from 'bignumber.js';

export const createAndBuy = async ({
  payer,
  mint,
  name,
  symbol,
  uri,
  buyAmount,
  priorityFeeInSol,
  slippageDecimal,
  rpcUrl
}: {
  payer: Keypair;
  mint: Keypair;
  name: string;
  symbol: string;
  uri: string;
  buyAmount: string;
  priorityFeeInSol: number;
  slippageDecimal: number;
  rpcUrl: string;
}) => {
  const connection = new Connection(rpcUrl);
  const provider = new AnchorProvider(connection, new Wallet(payer));
  const createTx = await createSPLInstruction(
    provider,
    payer.publicKey.toBase58(),
    mint,
    name,
    symbol,
    uri
  );
  const buyTx = await buySPLInstructions(
    connection,
    provider,
    payer,
    mint.publicKey.toBase58(),
    buyAmount,
    slippageDecimal
  );

  const microLamports = priorityFeeInSol * 1_000_000_000;
  const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports
  });

  const transaction = new Transaction();
  transaction.add(createTx);
  transaction.add(buyTx);
  transaction.add(addPriorityFee);

  try {
    const result = await connection.simulateTransaction(transaction, [payer]);
    if (result.value.err) {
      console.error(result.value.err);
      return Promise.reject(result.value.err);
    }
  } catch (e) {
    console.error(e);
    return Promise.reject(e);
  }

  return await signTxAndSend(connection, transaction, [payer, mint]);
};

export const buy = async ({
  payer,
  caAddr,
  buyAmount,
  priorityFeeInSol,
  slippageDecimal,
  rpcUrl
}: {
  payer: Keypair;
  caAddr: string;
  buyAmount: string;
  priorityFeeInSol: number;
  slippageDecimal: number;
  rpcUrl: string;
}) => {
  const connection = new Connection(rpcUrl);
  const provider = new AnchorProvider(connection, new Wallet(payer));
  let buyTx;
  try {
    buyTx = await buySPLInstructions(
      connection,
      provider,
      payer,
      caAddr,
      buyAmount,
      slippageDecimal
    );
  } catch (err) {
    console.error('buySPLInstructions error', err);
    return Promise.reject(err);
  }

  const microLamports = priorityFeeInSol * 1_000_000_000;
  const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports
  });

  const transaction = new Transaction();
  transaction.add(buyTx);
  transaction.add(addPriorityFee);

  return await signTxAndSend(connection, transaction, [payer]);
};

export const sell = async ({
  payer,
  caAddr,
  sellAmount, // 要卖的数量
  priorityFeeInSol, // 优先费用
  rpcUrl // rpc地址
}: {
  payer: Keypair;
  caAddr: string;
  sellAmount: string;
  priorityFeeInSol: number;
  rpcUrl: string;
}) => {
  const connection = new Connection(rpcUrl);
  const provider = new AnchorProvider(connection, new Wallet(payer));
  const sellTx = await sellSPLInstructions(
    provider,
    payer,
    caAddr,
    sellAmount
  );

  const microLamports = priorityFeeInSol * 1_000_000_000;
  const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports
  });

  const transaction = new Transaction();
  transaction.add(sellTx);
  transaction.add(addPriorityFee);

  return await signTxAndSend(connection, transaction, [payer]);
};

export const signTxAndSend = async (
  connection: Connection,
  transaction: Transaction,
  signers: Keypair[]
) => {
  return new Promise(async (resolve, reject) => {
    const tx = await sendAndConfirmTransaction(
      connection,
      transaction,
      signers
    );
    connection.onSignature(tx, async (result, context) => {
      if (result.err) {
        console.error(result.err);
        return reject(result.err);
      } else {
        return resolve(result);
      }
    });
  });
};

export const buySPLInstructions = async (
  connection: Connection,
  provider: Provider,
  payer: Keypair,
  caAddr: string,
  buyAmount: string, // 要购买的sol数量
  slippageDecimal: number // 最大购买成本
) => {
  const globalAccount = await getGlobalAccount(connection, 'finalized');
  const receiveAmount = globalAccount.getInitialBuyPrice(
    BigInt(Number(buyAmount) * LAMPORTS_PER_SOL)
  );
  const solInWithSlippage = Number(buyAmount) * (1 + slippageDecimal);
  const maxSolCost = Math.floor(solInWithSlippage * LAMPORTS_PER_SOL);

  const buyTx = await buyInstructions(
    provider,
    payer.publicKey,
    new PublicKey(caAddr),
    PUMP_FEE_RECEIPENT,
    receiveAmount,
    BigInt(Number(maxSolCost) * LAMPORTS_PER_SOL)
  );

  return buyTx;
};

export const sellSPLInstructions = async (
  provider: Provider,
  payer: Keypair,
  caAddr: string, // 要卖的合约地址
  sellAmount: string, // 要卖的数量
  minSolOutput: string = '0.00001' // meme单价
) => {
  const sellTx = await sellInstructions(
    provider,
    payer.publicKey,
    new PublicKey(caAddr),
    PUMP_FEE_RECEIPENT,
    BigInt(sellAmount),
    BigInt(Number(minSolOutput) * LAMPORTS_PER_SOL)
  );

  return sellTx;
};
