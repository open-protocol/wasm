export interface Env {
  block: BlockInfo;
  transaction: TransactionInfo | null;
  contract: ContractInfo;
}

export interface TransactionInfo {
  index: number;
}

export type Timestamp = string;

export interface BlockInfo {
  height: number;
  time: Timestamp;
  chain_id: string;
}

export type Addr = string;

export interface Coin {
  denom: string;
  amount: string;
}

export interface MessageInfo {
  sender: Addr;
  funds: Coin[];
}

export interface ContractInfo {
  address: Addr;
}
