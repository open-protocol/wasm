/// <reference types="node" />
import { Env, MessageInfo } from "../std/index.js";
import { Instance } from "./instance.js";
export declare const MI: number;
export declare const RESULT_INSTANTIATE: number;
export declare const RESULT_EXECUTE: number;
export declare const RESULT_QUERY: number;
export declare function callInstantiate(instance: Instance, env: Env, info: MessageInfo, msg: Buffer): Buffer;
export declare function callInstantiateRaw(instance: Instance, env: Buffer, info: Buffer, msg: Buffer): Buffer;
export declare function callExecute(instance: Instance, env: Env, info: MessageInfo, msg: Buffer): Buffer;
export declare function callExecuteRaw(instance: Instance, env: Buffer, info: Buffer, msg: Buffer): Buffer;
export declare function callQuery(instance: Instance, env: Env, msg: Buffer): Buffer;
export declare function callQueryRaw(instance: Instance, env: Buffer, msg: Buffer): Buffer;
