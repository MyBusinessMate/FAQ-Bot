import fs from "fs";
import path from "path";

export interface ContextLoaderOptions {
  filePath?: string;
}

export class ContextLoader {
  private filePath: string;
  private cachedContent: string | null = null;

  constructor(options?: ContextLoaderOptions) {
    this.filePath = options?.filePath || "context/context.md";
  }

  /**
   * Loads the markdown business context from disk.
   */
  load(forceReload = false): string {
    if (this.cachedContent && !forceReload) {
      return this.cachedContent;
    }

    const resolvedPath = path.isAbsolute(this.filePath)
      ? this.filePath
      : path.resolve(process.cwd(), this.filePath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        `Business context file not found at "${resolvedPath}". Please ensure "context/context.md" exists.`
      );
    }

    try {
      const content = fs.readFileSync(resolvedPath, "utf-8").trim();
      this.cachedContent = content;
      return content;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read business context file: ${msg}`);
    }
  }

  /**
   * Allows setting in-memory context directly (e.g. for unit tests).
   */
  setContext(content: string): void {
    this.cachedContent = content;
  }
}
