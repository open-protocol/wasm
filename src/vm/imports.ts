import { CommunicationError, VmError } from "../errors/index.js";
import { readRegion, writeRegion } from "./memory.js";
import * as secp from "@noble/secp256k1";
import * as ed from "@noble/ed25519";
import { Instance } from "./instance.js";
import { decodeSections } from "./sections.js";

const KI = 1024;
const MI = 1024 * 1024;
const MAX_LENGTH_DB_KEY = 64 * KI;
const MAX_LENGTH_DB_VALUE = 128 * KI;
const MAX_LENGTH_CANONICAL_ADDRESS = 64;
const MAX_LENGTH_HUMAN_ADDRESS = 256;
const MAX_LENGTH_QUERY_CHAIN_REQUEST = 64 * KI;
const MAX_LENGTH_ED25519_SIGNATURE = 64;
const MAX_LENGTH_ED25519_MESSAGE = 128 * 1024;
const MAX_COUNT_ED25519_BATCH = 256;
const MAX_LENGTH_DEBUG = 2 * MI;
const MAX_LENGTH_ABORT = 2 * MI;

const EDDSA_PUBKEY_LEN = 32;
const ECDSA_SIGNATURE_LEN = 64;
const ECDSA_UNCOMPRESSED_PUBKEY_LEN = 65;
const ECDSA_PUBKEY_MAX_LEN = ECDSA_UNCOMPRESSED_PUBKEY_LEN;
const MESSAGE_HASH_MAX_LEN = 32;

export function doDbRead(instance: Instance, keyPtr: number): number {
  const memory = instance.inner.exports.memory as WebAssembly.Memory;
  const key = readRegion(memory, keyPtr, MAX_LENGTH_DB_KEY);
  const value = instance.backend.storage.get(key);
  if (!value) {
    return 0;
  }
  return writeToContract(instance, value);
}

export function doDbWrite(
  instance: Instance,
  keyPtr: number,
  valuePtr: number
): void {
  const memory = instance.inner.exports.memory as WebAssembly.Memory;
  const key = readRegion(memory, keyPtr, MAX_LENGTH_DB_KEY);
  const value = readRegion(memory, valuePtr, MAX_LENGTH_DB_VALUE);
  instance.backend.storage.set(key, value);
}

export function doDbRemove(instance: Instance, keyPtr: number): void {
  const memory = instance.inner.exports.memory as WebAssembly.Memory;
  const key = readRegion(memory, keyPtr, MAX_LENGTH_DB_KEY);
  instance.backend.storage.remove(key);
}

export function doAddrValidate(instance: Instance, sourcePtr: number): number {
  const memory = instance.inner.exports.memory as WebAssembly.Memory;
  const sourceData = readRegion(memory, sourcePtr, MAX_LENGTH_HUMAN_ADDRESS);
  if (sourceData.length === 0) {
    return writeToContract(instance, Buffer.from("Input is empty", "utf8"));
  }
  const sourceString = sourceData.toString("utf8");
  const canonical = Buffer.from(sourceString, "base64url");
  const nomalized = canonical.toString("base64url");
  if (nomalized !== sourceString) {
    return writeToContract(
      instance,
      Buffer.from("Address is not normalized", "utf8")
    );
  }
  return 0;
}

export function doAddrCanonicalize(
  instance: Instance,
  sourcePtr: number,
  destinationPtr: number
): number {
  const memory = instance.inner.exports.memory as WebAssembly.Memory;
  const sourceData = readRegion(memory, sourcePtr, MAX_LENGTH_HUMAN_ADDRESS);
  if (sourceData.length === 0) {
    return writeToContract(instance, Buffer.from("Input is empty", "utf8"));
  }
  const canonical = instance.backend.api.canonicalAddress(
    sourceData.toString("utf8")
  );
  writeRegion(memory, destinationPtr, canonical);
  return 0;
}

export function doAddrHumanize(
  instance: Instance,
  sourcePtr: number,
  destinationPtr: number
): number {
  const memory = instance.inner.exports.memory as WebAssembly.Memory;
  const canonical = readRegion(memory, sourcePtr, MAX_LENGTH_CANONICAL_ADDRESS);
  const human = instance.backend.api.humanAddress(canonical);
  writeRegion(memory, destinationPtr, Buffer.from(human, "utf8"));
  return 0;
}

const SECP256K1_VERIFY_CODE_VALID = 0;
const SECP256K1_VERIFY_CODE_INVALID = 1;

export function doSecp256k1Verify(
  instance: Instance,
  hashPtr: number,
  signaturePtr: number,
  pubkeyPtr: number
): number {
  const memory = instance.inner.exports.memory as WebAssembly.Memory;
  const hash = readRegion(memory, hashPtr, MESSAGE_HASH_MAX_LEN);
  const signature = readRegion(memory, signaturePtr, ECDSA_SIGNATURE_LEN);
  const pubkey = readRegion(memory, pubkeyPtr, ECDSA_PUBKEY_MAX_LEN);
  const result = secp.verify(signature, hash, pubkey);
  return result ? SECP256K1_VERIFY_CODE_VALID : SECP256K1_VERIFY_CODE_INVALID;
}

export function doSecp256k1RecoverPubkey(
  instance: Instance,
  hashPtr: number,
  signaturePtr: number,
  recoverParam: number
): number {
  const memory = instance.inner.exports.memory as WebAssembly.Memory;
  const hash = readRegion(memory, hashPtr, MESSAGE_HASH_MAX_LEN);
  const sig = readRegion(memory, signaturePtr, ECDSA_SIGNATURE_LEN);
  const r = BigInt(`0x${sig.subarray(0, 32).toString("hex")}`);
  const s = BigInt(`0x${sig.subarray(32, 64).toString("hex")}`);

  const signature = new secp.Signature(r, s, recoverParam);
  const pubkey = Buffer.from(
    signature.recoverPublicKey(hash).toHex(false),
    "hex"
  );
  return writeToContract(instance, pubkey);
}

const ED25519_VERIFY_CODE_VALID = 0;
const ED25519_VERIFY_CODE_INVALID = 1;

export function doEd25519Verify(
  instance: Instance,
  messagePtr: number,
  signaturePtr: number,
  pubkeyPtr: number
): number {
  const memory = instance.inner.exports.memory as WebAssembly.Memory;
  const message = readRegion(memory, messagePtr, MAX_LENGTH_ED25519_MESSAGE);
  const signature = readRegion(
    memory,
    signaturePtr,
    MAX_LENGTH_ED25519_SIGNATURE
  );
  const pubkey = readRegion(memory, pubkeyPtr, EDDSA_PUBKEY_LEN);
  const result = ed.verify(signature, message, pubkey);
  return result ? ED25519_VERIFY_CODE_VALID : ED25519_VERIFY_CODE_INVALID;
}

export function doEd25519BatchVerify(
  instance: Instance,
  messagesPtr: number,
  signaturesPtr: number,
  publicKeysPtr: number
): number {
  const memory = instance.inner.exports.memory as WebAssembly.Memory;
  const messagesBuf = readRegion(
    memory,
    messagesPtr,
    (MAX_LENGTH_ED25519_MESSAGE + 4) * MAX_COUNT_ED25519_BATCH
  );
  const signaturesBuf = readRegion(
    memory,
    signaturesPtr,
    (MAX_LENGTH_ED25519_SIGNATURE + 4) * MAX_COUNT_ED25519_BATCH
  );
  const publicKeysBuf = readRegion(
    memory,
    publicKeysPtr,
    (EDDSA_PUBKEY_LEN + 4) * MAX_COUNT_ED25519_BATCH
  );

  let messages = decodeSections(messagesBuf);
  const signatures = decodeSections(signaturesBuf);
  let publicKeys = decodeSections(publicKeysBuf);

  const messagesLen = messages.length;
  const signaturesLen = signatures.length;
  const publicKeysLen = publicKeys.length;

  if (messagesLen === signaturesLen && signaturesLen === publicKeysLen) {
    //
  } else if (messagesLen === 1 && signaturesLen === publicKeysLen) {
    messages = new Array(signaturesLen).fill(messages[0]);
  } else if (publicKeysLen === 1 && messagesLen === signaturesLen) {
    publicKeys = new Array(signaturesLen).fill(publicKeys[0]);
  } else {
    return ED25519_VERIFY_CODE_INVALID;
  }

  if (
    messages.length !== signaturesLen ||
    messages.length !== publicKeys.length
  ) {
    return ED25519_VERIFY_CODE_INVALID;
  }

  for (let i = 0; i < messages.length; i++) {
    if (!ed.verify(signatures[i], messages[i], publicKeys[i])) {
      return ED25519_VERIFY_CODE_INVALID;
    }
  }
  return ED25519_VERIFY_CODE_VALID;
}

export function doDebug(instance: Instance, messagePtr: number): void {
  const memory = instance.inner.exports.memory as WebAssembly.Memory;
  const messageData = readRegion(memory, messagePtr, MAX_LENGTH_DEBUG);
  const msg = messageData.toString("utf8");
  console.log(msg);
}

export function doAbort(instance: Instance, messagePtr: number): void {
  const memory = instance.inner.exports.memory as WebAssembly.Memory;
  const messageData = readRegion(memory, messagePtr, MAX_LENGTH_ABORT);
  const msg = messageData.toString("utf8");
  throw VmError.aborted(msg);
}

function writeToContract(instance: Instance, input: Buffer): number {
  const targetPtr = (instance.inner.exports.allocate as CallableFunction)(
    input.length
  );
  if (targetPtr === 0) {
    throw CommunicationError.zeroAddress();
  }
  const memory = instance.inner.exports.memory as WebAssembly.Memory;
  writeRegion(memory, targetPtr, input);
  return targetPtr;
}

export function doQueryChain(instance: Instance, requestPtr: number): number {
  const memory = instance.inner.exports.memory as WebAssembly.Memory;
  const request = readRegion(
    memory,
    requestPtr,
    MAX_LENGTH_QUERY_CHAIN_REQUEST
  );
  const result = instance.backend.querier.queryRaw(request);
  return writeToContract(instance, result);
}

export function doDbScan(
  instance: Instance,
  startPtr: number,
  endPtr: number,
  order: number
): number {
  throw VmError.runtimeErr("Unsupported function");
}

export function doDbNext(instance: Instance, iteratorId: number): number {
  throw VmError.runtimeErr("Unsupported function");
}
