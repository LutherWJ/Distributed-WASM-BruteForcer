import type { VisualizerOptions } from "./types";
import useVisualizer from "./AudioVisualizer";

(() => {
  const uploadInput = document.getElementById(
    "audio-upload",
  ) as HTMLInputElement;
  const canvas = document.getElementById(
    "visualizer-canvas",
  ) as HTMLCanvasElement;
  const playBtn = document.getElementById("play-btn") as HTMLButtonElement;

  const options: VisualizerOptions = {
    uploadInput,
    canvas,
    playBtn,
  };

  useVisualizer(options);
})();
