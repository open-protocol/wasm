import { Env, MessageInfo } from "../std/index.js";
import { Instance } from "./instance.js";
import { readRegion, writeRegion } from "./memory.js";

export const MI: number = 1024 * 1024;
export const RESULT_INSTANTIATE: number = 64 * MI;
export const RESULT_EXECUTE: number = 64 * MI;
export const RESULT_QUERY: number = 64 * MI;

export function callInstantiate(
  instance: Instance,
  env: Env,
  info: MessageInfo,
  msg: Buffer
): Buffer {
  return callInstantiateRaw(
    instance,
    Buffer.from(JSON.stringify(env), "utf8"),
    Buffer.from(JSON.stringify(info), "utf8"),
    msg
  );
}

export function callInstantiateRaw(
  instance: Instance,
  env: Buffer,
  info: Buffer,
  msg: Buffer
): Buffer {
  return callRaw(instance, "instantiate", [env, info, msg], RESULT_INSTANTIATE);
}

export function callExecute(
  instance: Instance,
  env: Env,
  info: MessageInfo,
  msg: Buffer
): Buffer {
  return callExecuteRaw(
    instance,
    Buffer.from(JSON.stringify(env), "utf8"),
    Buffer.from(JSON.stringify(info), "utf8"),
    msg
  );
}

export function callExecuteRaw(
  instance: Instance,
  env: Buffer,
  info: Buffer,
  msg: Buffer
): Buffer {
  return callRaw(instance, "execute", [env, info, msg], RESULT_EXECUTE);
}

export function callQuery(instance: Instance, env: Env, msg: Buffer): Buffer {
  return callQueryRaw(instance, Buffer.from(JSON.stringify(env), "utf8"), msg);
}

export function callQueryRaw(
  instance: Instance,
  env: Buffer,
  msg: Buffer
): Buffer {
  return callRaw(instance, "query", [env, msg], RESULT_QUERY);
}

function callRaw(
  instance: Instance,
  name: string,
  args: Buffer[],
  resultMaxLegnth: number
): Buffer {
  const argRegionPtrs: number[] = [];
  const { allocate, memory } = instance.inner.exports;
  for (const arg of args) {
    const regionPtr = (allocate as CallableFunction)(arg.length);
    writeRegion(memory as WebAssembly.Memory, regionPtr, arg);
    argRegionPtrs.push(regionPtr);
  }
  const resRegionPtr = (instance.inner.exports[name] as CallableFunction)(
    ...argRegionPtrs
  );
  const data = readRegion(
    memory as WebAssembly.Memory,
    resRegionPtr,
    resultMaxLegnth
  );
  const { deallocate } = instance.inner.exports;
  (deallocate as CallableFunction)(resRegionPtr);
  return data;
}
