import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { StakingProgram } from "../target/types/staking_program";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
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
    console.log("Your transaction signature", tx);
  });
});
