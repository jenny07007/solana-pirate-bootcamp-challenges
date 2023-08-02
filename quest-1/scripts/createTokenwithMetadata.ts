import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

// spl-token
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAccount,
  createInitializeMint2Instruction,
  createMint,
  mintTo,
} from "@solana/spl-token";

// metadata
import {
  PROGRAM_ID as METADATA_PROGRAM_ID,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";

// helpers
import { payer, testWallet, connection } from "@/libs/vars";
import {
  buildTransaction,
  explorerURL,
  extractSignatureFromFailedTransaction,
  printConsoleSeparator,
  savePublicKeyToFile,
  uploadImagAndGetMetadaUri,
} from "@/libs/helpers";

(async () => {
  console.log("Payer address:", payer.publicKey.toBase58());
  console.log("Test wallet address:", testWallet.publicKey.toBase58());

  // create new keypairs to be used for mint accounts - gold, rum, cammons
  const goldMintKerpair = Keypair.generate();
  const rumMintKerpair = Keypair.generate();
  const cammonsMintKerpair = Keypair.generate();

  console.log("Mint address - Gold: ", goldMintKerpair.publicKey.toBase58());
  console.log("Mint address - Rum: ", rumMintKerpair.publicKey.toBase58());
  console.log(
    "Mint address - Cammons: ",
    cammonsMintKerpair.publicKey.toBase58(),
  );

  // token configurations
  const gold_token_config = {
    decimals: 2,
    name: "Seven Seas Gold",
    symbol: "GOLD",
    uri: await uploadImagAndGetMetadaUri(
      connection,
      payer,
      "coin1-tp.png",
      "GOLD",
    ),
  };

  const rum_token_config = {
    decimals: 2,
    name: "Seven Seas Rum",
    symbol: "RUM",
    uri: await uploadImagAndGetMetadaUri(connection, payer, "rum.png", "RUM"),
  };

  const cammons_token_config = {
    decimals: 2,
    name: "Seven Seas Cammons",
    symbol: "CAMMONS",
    uri: await uploadImagAndGetMetadaUri(
      connection,
      payer,
      "cannon-ball.png",
      "CAMMONS",
    ),
  };

  // Create instructions for token mint account
  const createGoldMintAccountInstruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: goldMintKerpair.publicKey,
    space: MINT_SIZE,
    lamports: await connection.getMinimumBalanceForRentExemption(MINT_SIZE),
    programId: TOKEN_PROGRAM_ID,
  });

  const createRumMintAccountInstruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: rumMintKerpair.publicKey,
    space: MINT_SIZE,
    lamports: await connection.getMinimumBalanceForRentExemption(MINT_SIZE),
    programId: TOKEN_PROGRAM_ID,
  });

  const createCammonsMintAccountInstruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: cammonsMintKerpair.publicKey,
    space: MINT_SIZE,
    lamports: await connection.getMinimumBalanceForRentExemption(MINT_SIZE),
    programId: TOKEN_PROGRAM_ID,
  });

  const initialGoldMintInstruction = createInitializeMint2Instruction(
    goldMintKerpair.publicKey,
    gold_token_config.decimals,
    payer.publicKey,
    payer.publicKey,
  );

  const initialRumMintInstruction = createInitializeMint2Instruction(
    rumMintKerpair.publicKey,
    rum_token_config.decimals,
    payer.publicKey,
    payer.publicKey,
  );

  const initialCammonsMintInstruction = createInitializeMint2Instruction(
    cammonsMintKerpair.publicKey,
    cammons_token_config.decimals,
    payer.publicKey,
    payer.publicKey,
  );

  // derive the pdas for the gold, rum, cammons metadata accounts
  const goldMetadataAccount = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      goldMintKerpair.publicKey.toBuffer(),
    ],
    METADATA_PROGRAM_ID,
  )[0];

  const rumMetadataAccount = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      rumMintKerpair.publicKey.toBuffer(),
    ],
    METADATA_PROGRAM_ID,
  )[0];

  const cammonsMetadataAccount = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      cammonsMintKerpair.publicKey.toBuffer(),
    ],
    METADATA_PROGRAM_ID,
  )[0];

  console.log("Gold Metadata address:", goldMetadataAccount.toBase58());
  console.log("Rum Metadata address:", rumMetadataAccount.toBase58());
  console.log("Cammons Metadata address:", cammonsMetadataAccount.toBase58());

  // create metadata accounts for gold, rum, cammons mints
  const createGoldMetadataAccountInstruction =
    createCreateMetadataAccountV3Instruction(
      {
        metadata: goldMetadataAccount,
        mint: goldMintKerpair.publicKey,
        mintAuthority: payer.publicKey,
        payer: payer.publicKey,
        updateAuthority: payer.publicKey,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            creators: null,
            name: gold_token_config.name,
            symbol: gold_token_config.symbol,
            uri: gold_token_config.uri,
            sellerFeeBasisPoints: 0,
            collection: null,
            uses: null,
          },
          collectionDetails: null, // for non-nft tokens normally set to null
          isMutable: true,
        },
      },
    );

  const createRumMetadataAccountInstruction =
    createCreateMetadataAccountV3Instruction(
      {
        metadata: rumMetadataAccount,
        mint: rumMintKerpair.publicKey,
        mintAuthority: payer.publicKey,
        payer: payer.publicKey,
        updateAuthority: payer.publicKey,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            creators: null,
            name: rum_token_config.name,
            symbol: rum_token_config.symbol,
            uri: rum_token_config.uri,
            sellerFeeBasisPoints: 0,
            collection: null,
            uses: null,
          },
          collectionDetails: null,
          isMutable: true,
        },
      },
    );

  const createCammonsMetadataAccountInstruction =
    createCreateMetadataAccountV3Instruction(
      {
        metadata: cammonsMetadataAccount,
        mint: cammonsMintKerpair.publicKey,
        mintAuthority: payer.publicKey,
        payer: payer.publicKey,
        updateAuthority: payer.publicKey,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            creators: null,
            name: cammons_token_config.name,
            symbol: cammons_token_config.symbol,
            uri: cammons_token_config.uri,
            sellerFeeBasisPoints: 0,
            collection: null,
            uses: null,
          },
          collectionDetails: null,
          isMutable: true,
        },
      },
    );

  const gold_tx = await buildTransaction({
    connection,
    payer: payer.publicKey,
    signers: [payer, goldMintKerpair],
    instructions: [
      createGoldMintAccountInstruction,
      initialGoldMintInstruction,
      createGoldMetadataAccountInstruction,
    ],
  });

  const rum_tx = await buildTransaction({
    connection,
    payer: payer.publicKey,
    signers: [payer, rumMintKerpair],
    instructions: [
      createRumMintAccountInstruction,
      initialRumMintInstruction,
      createRumMetadataAccountInstruction,
    ],
  });

  const cammons_tx = await buildTransaction({
    connection,
    payer: payer.publicKey,
    signers: [payer, cammonsMintKerpair],
    instructions: [
      createCammonsMintAccountInstruction,
      initialCammonsMintInstruction,
      createCammonsMetadataAccountInstruction,
    ],
  });

  printConsoleSeparator();

  try {
    const gold_sig = await connection.sendTransaction(gold_tx);
    console.log("Gold Transaction completed");
    console.log(explorerURL({ txSignature: gold_sig }));

    const rum_sig = await connection.sendTransaction(rum_tx);
    console.log("Rum Transaction completed");
    console.log(explorerURL({ txSignature: rum_sig }));

    const cammons_sig = await connection.sendTransaction(cammons_tx);
    console.log("Cammons Transaction completed");
    console.log(explorerURL({ txSignature: cammons_sig }));

    savePublicKeyToFile("goldMintKerpair", goldMintKerpair.publicKey);
    savePublicKeyToFile("rumMintKerpair", rumMintKerpair.publicKey);
    savePublicKeyToFile("cammonsMintKerpair", cammonsMintKerpair.publicKey);
  } catch (error) {
    console.error("Faild to send transaction");
    console.log(gold_tx);
    console.log(rum_tx);
    console.log(cammons_tx);

    const failedSig = await extractSignatureFromFailedTransaction(
      connection,
      error,
    );
    if (failedSig)
      console.log("Failed signature:", explorerURL({ txSignature: failedSig }));

    throw error;
  }
})();
