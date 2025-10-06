declare const chrome: any;
export class OffscreenManager {
  private static instance: OffscreenManager | null = null;
  private isCreated = false;
  private isCreating = false;
  private createPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): OffscreenManager {
    if (!OffscreenManager.instance) {
      OffscreenManager.instance = new OffscreenManager();
    }
    return OffscreenManager.instance;
  }

  public async ensureOffscreenDocument(): Promise<void> {
    if (this.isCreated) return;
    if (this.isCreating && this.createPromise) return this.createPromise;

    this.isCreating = true;
    this.createPromise = this._doCreateOffscreenDocument().finally(() => {
      this.isCreating = false;
    });
    return this.createPromise;
  }

  private async _doCreateOffscreenDocument(): Promise<void> {
    if (!chrome.offscreen) throw new Error("Offscreen API not available.");
    const existing: any = await (chrome.runtime as any).getContexts?.({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
    });
    if (existing && existing.length > 0) {
      this.isCreated = true;
      return;
    }
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["WORKERS"],
      justification: "Run workers for extension functionality",
    });
    this.isCreated = true;
  }

  public async closeOffscreenDocument(): Promise<void> {
    if (chrome.offscreen && this.isCreated) {
      await chrome.offscreen.closeDocument();
      this.isCreated = false;
    }
  }
}

export const offscreenManager = OffscreenManager.getInstance();
