import { Env, MessageInfo } from "../std/index.js";
import {
  callExecute,
  callInstantiate,
  callQuery,
  Backend,
  BackendApi,
  Instance,
  Querier,
  Storage,
} from "../vm/index.js";
import fs from "fs";

class MockBackendApi implements BackendApi {
  public canonicalAddress(human: string): Buffer {
    return Buffer.from(human, "base64url");
  }

  public humanAddress(canonical: Buffer): string {
    return canonical.toString("base64url");
  }
}

class MockQuerier implements Querier {
  public queryRaw(request: Buffer): Buffer {
    return Buffer.allocUnsafe(0);
  }
}

class MockStorage implements Storage {
  data: Map<string, Buffer>;

  constructor() {
    this.data = new Map<string, Buffer>();
  }

  public get(key: Buffer): Buffer {
    return this.data.get(key.toString("base64"));
  }

  public set(key: Buffer, value: Buffer): void {
    this.data.set(key.toString("base64"), value);
  }

  public remove(key: Buffer): void {
    this.data.delete(key.toString("base64"));
  }
}

(async () => {
  try {
    const code = fs.readFileSync("./contracts/cw20.wasm");
    const backend = new Backend(
      new MockBackendApi(),
      new MockStorage(),
      new MockQuerier()
    );
    const instance = await Instance.fromCode(code, backend);

    const env: Env = {
      block: {
        height: 1,
        time: new Date().getUTCMilliseconds().toString(),
        chain_id: "chainid",
      },
      transaction: null,
      contract: {
        address: "contractaddr",
      },
    };
    const info: MessageInfo = {
      sender: "W7HxkpaKwXif1gwj46gbNba7xKx9s8xUahh-Q_iQTdA",
      funds: [
        {
          denom: "opp",
          amount: 0n.toString(),
        },
      ],
    };

    const inistantiateMsg = {
      name: "opencoin",
      symbol: "opc",
      decimals: 9,
      initial_balances: [
        {
          address: "W7HxkpaKwXif1gwj46gbNba7xKx9s8xUahh-Q_iQTdA",
          amount: "1000000000",
        },
      ],
      mint: null,
      marketing: null,
    };
    let res = callInstantiate(
      instance,
      env,
      info,
      Buffer.from(JSON.stringify(inistantiateMsg), "utf8")
    );
    let resJson = JSON.parse(res.toString("utf8"));
    console.log(resJson);

    let queryMsg = {
      balance: {
        address: "W7HxkpaKwXif1gwj46gbNba7xKx9s8xUahh-Q_iQTdA",
      },
    };
    res = callQuery(
      instance,
      env,
      Buffer.from(JSON.stringify(queryMsg), "utf8")
    );
    resJson = JSON.parse(res.toString("utf8"));
    console.log(Buffer.from(resJson["ok"], "base64").toString("utf8"));

    const executeMsg = {
      transfer: {
        recipient: "gBdRgmpzvixp2Nnf76LLTCrSYpuJfGp3TTGm8MaxSxo",
        amount: "1000",
      },
    };
    res = callExecute(
      instance,
      env,
      info,
      Buffer.from(JSON.stringify(executeMsg), "utf8")
    );
    resJson = JSON.parse(res.toString("utf8"));
    console.log(resJson);

    queryMsg = {
      balance: {
        address: "W7HxkpaKwXif1gwj46gbNba7xKx9s8xUahh-Q_iQTdA",
      },
    };
    res = callQuery(
      instance,
      env,
      Buffer.from(JSON.stringify(queryMsg), "utf8")
    );
    resJson = JSON.parse(res.toString("utf8"));
    console.log(Buffer.from(resJson["ok"], "base64").toString("utf8"));

    queryMsg = {
      balance: {
        address: "gBdRgmpzvixp2Nnf76LLTCrSYpuJfGp3TTGm8MaxSxo",
      },
    };
    res = callQuery(
      instance,
      env,
      Buffer.from(JSON.stringify(queryMsg), "utf8")
    );
    resJson = JSON.parse(res.toString("utf8"));
    console.log(Buffer.from(resJson["ok"], "base64").toString("utf8"));
  } catch (e: any) {
    console.error({ e });
  }
})();
