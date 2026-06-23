// 이미지 파일의 실제 시그니처(매직바이트)로 형식을 판별한다.
// 확장자/Content-Type 위장(예: .gif를 .jpeg로 리네임)을 막기 위해 파일 선두 바이트를 직접 확인한다.
// 허용 형식은 BE LmsProfileImageValidator와 동일하게 JPEG·PNG.

// JPEG 시그니처: FF D8 FF
function isJpeg(header: Uint8Array): boolean {
  return header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
}

// PNG 시그니처: 89 50 4E 47 0D 0A 1A 0A
function isPng(header: Uint8Array): boolean {
  return (
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  );
}

// 파일 선두 8바이트를 읽어 JPEG 또는 PNG 시그니처인지 검사한다.
export async function hasAllowedImageSignature(file: File): Promise<boolean> {
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  return isJpeg(header) || isPng(header);
}
