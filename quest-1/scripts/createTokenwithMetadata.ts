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

// TokenConfig interface
interface TokenConfig {
  decimals: number;
  name: string;
  symbol: string;
  uri: string;
}

// Token basic data
const tokenConfigs = [
  {
    name: "gold",
    image: "coin1-tp.png",
    symbol: "GOLD",
    label: "Seven Seas Gold",
  },
  {
    name: "rum",
    image: "rum.png",
    symbol: "RUM",
    label: "Seven Seas Rum",
  },
  {
    name: "cammons",
    image: "cannon-ball.png",
    symbol: "CAMMONS",
    label: "Seven Seas Cammons",
  },
];

// define the assorted token config settings
async function createTokenConfig({
  name,
  image,
  symbol,
  label,
}: {
  name: string;
  image: string;
  symbol: string;
  label: string;
}) {
  return {
    decimals: 2,
    name: label,
    symbol,
    uri: await uploadImagAndGetMetadaUri(connection, payer, image, name),
  };
}

//  Instruction to create/initialize Mint account
async function createMintInstruction(
  tokinConfig: TokenConfig,
  mintKeypair: Keypair,
) {
  const createMintInstruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    space: MINT_SIZE,
    lamports: await connection.getMinimumBalanceForRentExemption(MINT_SIZE),
    programId: TOKEN_PROGRAM_ID,
  });
  // initalize that account as a mint
  const initialMintInstruction = createInitializeMint2Instruction(
    mintKeypair.publicKey,
    tokinConfig.decimals,
    payer.publicKey,
    payer.publicKey,
  );

  return [createMintInstruction, initialMintInstruction];
}

//  Instruction to create Metadata account using PDA
async function createMetadataInstruction(
  tokenConfig: TokenConfig,
  mintKeypair: Keypair,
) {
  const metadataAccount = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mintKeypair.publicKey.toBuffer(),
    ],
    METADATA_PROGRAM_ID,
  )[0];

  const createMetadataAccountInstruction =
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataAccount,
        mint: mintKeypair.publicKey,
        mintAuthority: payer.publicKey,
        payer: payer.publicKey,
        updateAuthority: payer.publicKey,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            creators: null,
            name: tokenConfig.name,
            symbol: tokenConfig.symbol,
            uri: tokenConfig.uri,
            sellerFeeBasisPoints: 0,
            collection: null,
            uses: null,
          },
          collectionDetails: null,
          isMutable: true,
        },
      },
    );

  return createMetadataAccountInstruction;
}

(async () => {
  console.log("Payer address:", payer.publicKey.toBase58());
  console.log("Test wallet address:", testWallet.publicKey.toBase58());

  for (const config of tokenConfigs) {
    // keypair to be used for mint
    const mintKeypair = Keypair.generate();
    console.log(
      `Mint address - ${config.name}: ${mintKeypair.publicKey.toBase58()}`,
    );

    // token cofig, create mint account, and metadata account for the mint
    const tokenConfig = await createTokenConfig(config);
    const mintInstruction = await createMintInstruction(
      tokenConfig,
      mintKeypair,
    );
    const metadataInstruction = await createMetadataInstruction(
      tokenConfig,
      mintKeypair,
    );

    // build transaction and sent to the blockchain
    const tx = await buildTransaction({
      connection,
      payer: payer.publicKey,
      signers: [payer, mintKeypair],
      instructions: [...mintInstruction, metadataInstruction],
    });

    printConsoleSeparator();

    try {
      const signature = await connection.sendTransaction(tx);
      console.log(`${config.name} Transaction completed`);
      console.log(explorerURL({ txSignature: signature }));
      savePublicKeyToFile(`${config.name}MintKepair`, mintKeypair.publicKey);
    } catch (error) {
      console.error("Faild to send transaction");
      console.log(tx);

      const failedSig = await extractSignatureFromFailedTransaction(
        connection,
        error,
      );
      if (failedSig)
        console.log(
          "Failed signature:",
          explorerURL({ txSignature: failedSig }),
        );

      throw error;
    }
  }
})();
