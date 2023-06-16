export class VmError implements Error {
  name: string;
  message: string;
  stack?: string;

  constructor(name: string, message: string) {
    this.name = name;
    this.message = message;
  }

  static aborted = (msg: string) => {
    return new VmError("Aborted", msg);
  };

  static runtimeErr = (msg: string) => {
    return new VmError("RuntimeErr", `Error executing Wasm: ${msg}`);
  };
}
