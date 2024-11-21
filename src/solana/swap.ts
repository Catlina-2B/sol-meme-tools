import { PublicKey, Connection } from '@solana/web3.js';

import { struct, bool, u64, publicKey, Layout } from '@coral-xyz/borsh';

import * as web3 from '@solana/web3.js';

import { PUMP_FUN_PROGRAM } from '../const';

export class GlobalAccount {
  public discriminator: bigint;
  public initialized: boolean;
  public authority: PublicKey;
  public feeRecipient: PublicKey;
  public initialVirtualTokenReserves: bigint;
  public initialVirtualSolReserves: bigint;
  public initialRealTokenReserves: bigint;
  public tokenTotalSupply: bigint;
  public feeBasisPoints: bigint;

  constructor(
    discriminator: bigint,
    initialized: boolean,
    authority: PublicKey,
    feeRecipient: PublicKey,
    initialVirtualTokenReserves: bigint,
    initialVirtualSolReserves: bigint,
    initialRealTokenReserves: bigint,
    tokenTotalSupply: bigint,
    feeBasisPoints: bigint
  ) {
    this.discriminator = discriminator;
    this.initialized = initialized;
    this.authority = authority;
    this.feeRecipient = feeRecipient;
    this.initialVirtualTokenReserves = initialVirtualTokenReserves;
    this.initialVirtualSolReserves = initialVirtualSolReserves;
    this.initialRealTokenReserves = initialRealTokenReserves;
    this.tokenTotalSupply = tokenTotalSupply;
    this.feeBasisPoints = feeBasisPoints;
  }

  getInitialBuyPrice(amount: bigint): bigint {
    if (amount <= BigInt(1)) {
      return BigInt(1);
    }

    let n = this.initialVirtualSolReserves * this.initialVirtualTokenReserves;
    let i = this.initialVirtualSolReserves + amount;
    let r = n / i + BigInt(1);
    let s = this.initialVirtualTokenReserves - r;
    return s < this.initialRealTokenReserves
      ? s
      : this.initialRealTokenReserves;
  }

  public static fromBuffer(buffer: Buffer): GlobalAccount {
    const structure: Layout<GlobalAccount> = struct([
      u64('discriminator'),
      bool('initialized'),
      publicKey('authority'),
      publicKey('feeRecipient'),
      u64('initialVirtualTokenReserves'),
      u64('initialVirtualSolReserves'),
      u64('initialRealTokenReserves'),
      u64('tokenTotalSupply'),
      u64('feeBasisPoints')
    ]);

    let value = structure.decode(buffer);
    return new GlobalAccount(
      BigInt(value.discriminator),
      value.initialized,
      value.authority,
      value.feeRecipient,
      BigInt(value.initialVirtualTokenReserves),
      BigInt(value.initialVirtualSolReserves),
      BigInt(value.initialRealTokenReserves),
      BigInt(value.tokenTotalSupply),
      BigInt(value.feeBasisPoints)
    );
  }
}

export async function getGlobalAccount(
  conn: Connection,
  commitment: web3.Commitment
) {
  const [globalAccountPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('global')],
    PUMP_FUN_PROGRAM
  );
  const tokenAccount = await conn.getAccountInfo(globalAccountPDA, commitment);

  if (!tokenAccount) {
    throw new Error('Token account not found');
  }

  return GlobalAccount.fromBuffer(tokenAccount.data);
}
