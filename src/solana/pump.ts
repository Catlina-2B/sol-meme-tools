import { Program, Provider } from '@coral-xyz/anchor';
import { Commitment, Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, getAccount, getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { MPLX_METADATA, PUMP_FUN_PROGRAM } from '../const';
import { IDL, PumpFun } from '../const/IDL';

import { BN } from "bn.js";

export const createSPLInstruction = async (
  provider: Provider,
  payer: string,
  mint: Keypair,
  memename: string,
  symbol: string,
  uri: string
) => {
  const mplTokenMetadata = MPLX_METADATA;
  const METADATA_SEED = 'metadata';
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_SEED),
      mplTokenMetadata.toBuffer(),
      mint.publicKey.toBuffer()
    ],
    mplTokenMetadata
  );
  let program = new Program<PumpFun>(IDL as PumpFun, provider);
  const bonding_curve_pda = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.publicKey.toBuffer()],
    program.programId
  )[0];

  const associatedBondingCurve = await getAssociatedTokenAddress(
    mint.publicKey,
    bonding_curve_pda,
    true
  );

  return await program.methods
    .create(memename, symbol, uri)
    .accounts({
      mint: mint.publicKey,
      associatedBondingCurve: associatedBondingCurve,
      metadata: metadataPDA,
      user: payer
    })
    .signers([mint])
    .instruction();
};

export async function buyInstructions(
  provider: Provider,
  buyer: PublicKey,
  mint: PublicKey,
  feeRecipient: PublicKey,
  amount: bigint,
  maxSolCost: bigint,
) {
  const associatedBondingCurve = await getAssociatedTokenAddress(
    mint,
    getBondingCurvePDA(mint),
    true
  );

  const associatedUser = await getAssociatedTokenAddress(mint, buyer, false);

  let transaction = new Transaction();

  try {
    await getAccount(provider.connection, associatedUser, 'finalized');
  } catch (e) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        buyer,
        associatedUser,
        buyer,
        mint,
      )
    );
  }

  let program = new Program<PumpFun>(IDL as PumpFun, provider);
  transaction.add(
    await program.methods
      .buy(new BN(amount.toString()), new BN(maxSolCost.toString()))
      .accounts({
        feeRecipient: feeRecipient,
        mint: mint,
        associatedBondingCurve: associatedBondingCurve,
        associatedUser: associatedUser,
        user: buyer,
      })
      .instruction()
  );

  return transaction;
}

export async function sellInstructions(
  provider: Provider,
  seller: PublicKey,
  mint: PublicKey,
  feeRecipient: PublicKey,
  amount: bigint,
  minSolOutput: bigint,
) {
  const associatedBondingCurve = await getAssociatedTokenAddress(
    mint,
    getBondingCurvePDA(mint),
    true
  );

  const associatedUser = await getAssociatedTokenAddress(mint, seller, false);

  let transaction = new Transaction();

  try {
    await getAccount(provider.connection, associatedUser, 'finalized');
  } catch (e) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        seller,
        associatedUser,
        seller,
        mint,
      )
    );
  }

  let program = new Program<PumpFun>(IDL as PumpFun, provider);
  transaction.add(
    await program.methods
      .sell(new BN(amount.toString()), new BN(minSolOutput.toString()))
      .accounts({
        feeRecipient: feeRecipient,
        mint: mint,
        associatedBondingCurve: associatedBondingCurve,
        associatedUser: associatedUser,
        user: seller,
      })
      .instruction()
  );

  return transaction;
}

export function getBondingCurvePDA(mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    PUMP_FUN_PROGRAM
  )[0];
}

export const calculateWithSlippageBuy = (
  amount: bigint,
  basisPoints: bigint
) => {
  return amount + (amount * basisPoints) / BigInt(100);
};