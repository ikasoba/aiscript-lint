export function getLine(src: string, index: number) {
  return src.slice(0, index).split(/\r\n|[\r\n]/g)?.length ?? 1;
}

export function getLineIndex(src: string, index: number) {
  const v = src.slice(0, index).lastIndexOf("\n");
  if (v >= 0) {
    return index - v + 1;
  } else return index + 1;
}
