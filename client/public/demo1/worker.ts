import { jsBlur as blurImage } from "./blur.ts";

declare var self: Worker;

self.onmessage = async (event: MessageEvent) => {
  const params = event.data;

  try {
    const inputView = new Uint8ClampedArray(params.inputBuffer);
    const outputView = new Uint8ClampedArray(params.outputBuffer);

    const start = performance.now();
    blurImage(
      inputView,
      outputView,
      params.width,
      params.height,
      params.radius,
    );
    const end = performance.now();

    self.postMessage({ result: "done", duration: end - start });
  } catch (err) {
    self.postMessage({
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

