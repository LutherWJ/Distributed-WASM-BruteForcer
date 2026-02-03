import config from "./config";

export function generatePassword(length: number): string {
  let result = "";
  const len = config.charset.length;

  for (let i = 0; i < length; i++) {
    result += config.charset.charAt(Math.floor(Math.random() * len));
  }

  return result;
}
