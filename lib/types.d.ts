import { EventEmitter } from 'events';
import { PassThrough } from 'stream';

// ============================================================================
// Font Data Types
// ============================================================================

/**
 * Raw font data from the GWFH API or cache
 */
export interface FontData {
  /** Font family name (primary) */
  family?: string;
  /** Font family name (alternative key) */
  familyName?: string;
  /** Font category (e.g., 'serif', 'sans-serif', 'display') */
  category?: string;
  /** Available variants - array of IDs or map of variant ID to URL */
  variants?: string[] | Record<string, string>;
  /** Allow indexing by string for dynamic field access */
  [key: string]: string | string[] | Record<string, string> | undefined;
}

/**
 * Result of a font download or install operation
 */
export interface FontResult {
  /** Font family name */
  family: string;
  /** Variant that was processed (e.g., 'regular', 'bold', '700italic') */
  variant: string;
  /** Local file path where the font was saved */
  path: string;
}

/**
 * Supported font file formats
 */
export type FontFormat = 'ttf' | 'woff2';

/**
 * GWFH API variant entry
 */
export interface GWFHVariant {
  id: string;
  ttf?: string;
  woff2?: string;
}

/**
 * GWFH API response for a single font
 */
export interface GWFHFontResponse {
  variants: GWFHVariant[];
}

// ============================================================================
// Cache Types
// ============================================================================

/**
 * Structure of the cache file
 */
export interface CachePayload {
  /** Timestamp when the cache was written */
  fetchedAt: number;
  /** Cached font list */
  fonts: FontData[];
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * MIME type detection result from file-type
 */
export interface MimeTypeResult {
  mime: string;
  ext?: string;
}

// ============================================================================
// Callback Types
// ============================================================================

/**
 * Standard Node.js-style error-first callback
 */
export type ErrorCallback = (err: Error | null) => void;

/**
 * Callback for font list operations
 */
export type FontListCallback = (err: Error | null, list: any) => void;

/**
 * Callback for font result operations
 */
export type FontResultCallback = (err: Error | null, result?: FontResult[]) => void;

/**
 * Callback for file map operations
 */
export type FileMapCallback = (err: Error | null, files?: Record<string, string>) => void;

// ============================================================================
// Class Instance Types (for JSDoc references)
// ============================================================================

/**
 * GoogleFont instance type
 */
export interface GoogleFontInstance extends FontData {
  family: string;
  category?: string;
  variants?: string[] | Record<string, string>;
  apiUrl: string;
  _fileName: string;
  
  getFamily(): string;
  getVariants(): string[];
  getCategory(): string | undefined;
  getCssUrl(): string;
  _getFileMap(format: FontFormat | FileMapCallback, callback?: FileMapCallback): void | Promise<Record<string, string>>;
  _getFileMapAsync(format?: FontFormat): Promise<Record<string, string>>;
  install(variants?: string[] | false, callback?: FontResultCallback): void;
  installAsync(variants?: string[] | false): Promise<FontResult[]>;
  saveAt(variants?: string[] | false, destFolder?: string, format?: FontFormat | FontResultCallback, callback?: FontResultCallback): void;
  saveAtAsync(variants?: string[] | false, destFolder?: string, format?: FontFormat): Promise<FontResult[]>;
  _normalizeVariant(variant: string): string;
}

/**
 * GoogleFontList instance type
 */
export interface GoogleFontListInstance {
  data: GoogleFontInstance[];
  _loading: boolean;
  _loadingPromise: Promise<{ fromCache: boolean }> | null;
  _filterField?: string;
  _filterTerm?: string;
  loaded?: boolean;
  
  downloadList(): Promise<{ fromCache: boolean }>;
  load(forceRefresh?: boolean): Promise<{ fromCache: boolean }>;
  parseRawData(rawData: string): void;
  populate(list: FontData[]): void;
  clone(): GoogleFontListInstance;
  searchFont(term: string, field: string, callback: FontListCallback): void;
  searchFontByName(term: string, callback: FontListCallback): void;
  searchFontByType(term: string, callback: FontListCallback): void;
  getFont(term: string, field: string, callback: FontListCallback): void;
  getFontByName(term: string, callback: FontListCallback): void;
  getFontByType(term: string, callback: FontListCallback): void;
  getFirst(): GoogleFontInstance | false;
  isSingle(): boolean;
  forEachFont(fn: (font: GoogleFontInstance, index: number) => void, callback?: () => void): void;
  
  // EventEmitter methods
  on(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
}

/**
 * Request instance type
 */
export interface RequestInstance {
  redirect: number;
  _mimeType?: MimeTypeResult;
  req?: import('http').ClientRequest;
  mimeType: boolean | MimeTypeResult;
  _fisrtBytes: boolean;
  
  init(uri: string): void;
  _getProperLibray(uri: URL): typeof import('http') | typeof import('https');
  handleResponse(res: import('http').IncomingMessage, originalUri: string): void;
  handleError(error: Error): void;
  getMimeType(): MimeTypeResult | undefined;
  
  // PassThrough/EventEmitter methods
  on(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
  write(chunk: any): boolean;
  end(): this;
  pipe<T extends NodeJS.WritableStream>(destination: T): T;
}

/**
 * SystemFont instance type
 */
export interface SystemFontInstance {
  _saveTmp(remoteFile: string, fileName: string): Promise<string>;
  _move(oldPath: string, destFolder: string): Promise<string>;
  _checkDestFolder(destFolder?: string | null | false): Promise<string>;
  _isFolderOk(folder: string): Promise<void>;
  saveAt(remoteFile: string, destFolder: string | false, fileName: string): Promise<string>;
  saveHere(remoteFile: string, fileName: string): Promise<string>;
  install(remoteFile: string, fileName: string): Promise<string>;
}

// ============================================================================
// Module declarations for untyped packages
// ============================================================================

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
