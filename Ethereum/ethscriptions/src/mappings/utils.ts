export function hexToUTF8(hexString: string) {
  if (hexString.indexOf("0x") === 0) {
    hexString = hexString.slice(2);
  }

  const bytes = new Uint8Array(hexString.length / 2);

  for (let index = 0; index < bytes.length; index++) {
    const start = index * 2;
    const hexByte = hexString.slice(start, start + 2);
    const byte = Number.parseInt(hexByte, 16);
    if (Number.isNaN(byte) || byte < 0)
      throw new Error(
        `Invalid byte sequence ("${hexByte}" in "${hexString}").`
      );
    bytes[index] = byte;
  }

  let result = new TextDecoder().decode(bytes);
  return result.replace(/\0/g, "");
}

export function isValidDataUri(uri: string): boolean {
  const regexp =
    /data:(?<mediatype>(?<mimetype>.+?\/.+?)?(?<parameters>(?:;.+?=.*?)*))?(?<extension>;base64)?,(?<data>.*)/;
  const match = regexp.exec(uri);

  if (!match || !match.groups) {
    return false;
  }

  const { data, extension } = match.groups;
  return validBase64Content(data, extension);
}

export function validBase64Content(data: string, extension?: string): boolean {
  if (extension) {
    try {
      atob(data);
      return true;
    } catch (error) {
      return false;
    }
  } else {
    return true;
  }
}
