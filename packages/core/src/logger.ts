export class Logger {
  constructor(private verbose: boolean) {}

  info(msg: string): void {
    console.log(`[Testably] ${msg}`);
  }

  warn(msg: string): void {
    console.warn(`[Testably] ${msg}`);
  }

  error(msg: string): void {
    console.error(`[Testably] ${msg}`);
  }

  debug(msg: string): void {
    if (this.verbose) {
      console.log(`[Testably:debug] ${msg}`);
    }
  }
}
