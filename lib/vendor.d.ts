// Type declarations for third-party modules without types

declare module 'copy-paste-win32fix' {
  export function copy(text: string, callback?: () => void): void;
  export function paste(callback?: (err: Error | null, text: string) => void): void;
}

declare module 'node-powershell' {
  interface PowerShellOptions {
    executionPolicy?: string;
    noProfile?: boolean;
  }
  
  class PowerShell {
    constructor(options?: PowerShellOptions);
    addCommand(command: string): void;
    invoke(): Promise<string>;
    dispose(): void;
  }
  
  export = PowerShell;
}

declare module 'pascal-case' {
  function pascalCase(str: string): string;
  export = pascalCase;
}
