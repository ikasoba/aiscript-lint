export const toBase64 = (buf: string) =>
  btoa(
    [...new TextEncoder().encode(buf)]
      .map((x) => String.fromCharCode(x))
      .join("")
  );

export const fromBase64 = (buf: string) =>
  new TextDecoder().decode(
    new Uint8Array(
      atob(buf)
        .split("")
        .map((x) => x.charCodeAt(0))
    )
  );
