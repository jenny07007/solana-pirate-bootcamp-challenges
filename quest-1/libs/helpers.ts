import fs from "fs";
import path from "path";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

const DEFAULT_KEY_DIR_NAME = ".local_keys";
const DEFAULT_PUBLIC_KEY_FILE = "key.json";
const DEFAULT_DEMO_DATA_FILE = "demo.json";

/**
 *
 * Load locally stored PublicKey address
 */

export function loadKeypairFromFile(absPath: string) {
  try {
    if (!absPath) throw Error("No path provided");
    if (!fs.existsSync(absPath)) throw Error("File does not exist.");

    const keyfileBytes = JSON.parse(
      fs.readFileSync(absPath, { encoding: "utf8" }),
    );
    const keypair = Keypair.fromSecretKey(new Uint8Array(keyfileBytes));
    return keypair;
  } catch (error) {
    throw error;
  }
}

/**
 * Save a locally stored JSON keypair file for later importing
 */

export function saveKeypairToFile(
  keypair: Keypair,
  fileName: string,
  dirName: string,
) {
  fileName = path.join(dirName, `${fileName}.json`);

  if (!fs.existsSync(`./${dirName}/`)) fs.mkdirSync(`./${dirName}/`);
  if (!fs.existsSync(fileName)) fs.unlinkSync(fileName);

  fs.writeFileSync(fileName, `[${keypair.secretKey.toString()}]`, {
    encoding: "utf8",
  });

  return fileName;
}

/**
 *
 * Attempt to load a keypair from the filesystem, or generate a new one
 */
export function loadOrGenerateKeypair(
  fileName: string,
  dirName: string = DEFAULT_KEY_DIR_NAME,
) {
  try {
    const searchPath = path.join(dirName, `${fileName}.json`);
    let keypair = Keypair.generate();

    if (fs.existsSync(searchPath)) keypair = loadKeypairFromFile(searchPath);
    else saveKeypairToFile(keypair, fileName, dirName);
    return keypair;
  } catch (error) {
    console.error("loadOrGenerateKeypair:", error);
    throw error;
  }
}
