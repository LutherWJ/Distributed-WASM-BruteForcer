import type { VisualizerOptions } from "./types";
import useVisualizer from "./AudioVisualizer";

function main() {
  const input = document.getElementById("input") as HTMLInputElement;
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const playBtn = document.getElementById("playBtn") as HTMLButtonElement;

  const options: VisualizerOptions = {
    uploadInput: input,
    canvas: canvas,
    playBtn: playBtn,
  };

  const visualizer = useVisualizer(options);
}

main();
