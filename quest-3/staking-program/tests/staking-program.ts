import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { StakingProgram } from "../target/types/staking_program";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { mintSecret } from "../mintKeypair";

describe("staking-program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const payer = provider.wallet as anchor.Wallet;
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");

  const program = anchor.workspace.StakingProgram as Program<StakingProgram>;

  // const mintKeypair = Keypair.generate();
  const mintKeypair = Keypair.fromSecretKey(new Uint8Array(mintSecret));
  // console.log(mintKeypair);

  const createMintTokenAccount = async () => {
    const mint = await createMint(
      connection,
      payer.payer, // signer
      payer.publicKey,
      payer.publicKey,
      9,
      mintKeypair,
    );

    console.log(mint);
  };

  it("Is initialized!", async () => {
    // await createMintTokenAccount();

    let [vaultAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId,
    );

    const tx = await program.methods
      .initialize()
      .accounts({
        signer: payer.publicKey,
        tokenVaultAccount: vaultAccount,
        mint: mintKeypair.publicKey,
      })
      .rpc();
    console.log("init mint token account transaction signature", tx);
  });

  it("Staked", async () => {
    let userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      mintKeypair.publicKey,
      payer.publicKey,
    );

    // mint some tokes to the token account because it might be empty
    await mintTo(
      connection,
      payer.payer,
      mintKeypair.publicKey,
      userTokenAccount.address,
      payer.payer,
      1e11, // 10 to power of 11
    );

    let [stakeInfo] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake_info"), payer.publicKey.toBuffer()],
      program.programId,
    );

    let [stakeAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("token"), payer.publicKey.toBuffer()],
      program.programId,
    );

    // ensure the ATA has created
    await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      mintKeypair.publicKey,
      payer.publicKey,
    );

    const tx = await program.methods
      .stake(new anchor.BN(1)) // send 1 token
      .signers([payer.payer])
      .accounts({
        signer: payer.publicKey,
        mint: mintKeypair.publicKey,
        stakeInfoAccount: stakeInfo,
        stakeAccount: stakeAccount,
        userTokenAccount: userTokenAccount.address,
      })
      .rpc();
    console.log("Staked transaction signature", tx);
  });

  it("Destake", async () => {
    let userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      mintKeypair.publicKey,
      payer.publicKey,
    );

    let [stakeInfo] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake_info"), payer.publicKey.toBuffer()],
      program.programId,
    );

    let [stakeAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("token"), payer.publicKey.toBuffer()],
      program.programId,
    );

    let [vaultAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId,
    );

    // ensure our vault account has enough tokens to distribute as rewards
    await mintTo(
      connection,
      payer.payer,
      mintKeypair.publicKey,
      vaultAccount,
      payer.payer,
      1e21,
    );

    const tx = await program.methods
      .destake()
      .signers([payer.payer])
      .accounts({
        stakeAccount: stakeAccount,
        stakeInfoAccount: stakeInfo,
        userTokenAccount: userTokenAccount.address,
        tokenVaultAccount: vaultAccount,
        signer: payer.publicKey,
        mint: mintKeypair.publicKey,
      })
      .rpc();
    console.log("Destaked transaction signature", tx);
  });
});
