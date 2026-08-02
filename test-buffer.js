try {
  const arr = new Uint8Array([1, 2, 3])
  const buf = Buffer.from(arr)
  console.log("Uint8Array works", buf)
} catch (e) {
  console.log("Uint8Array failed", e)
}

try {
  const arrBuf = new ArrayBuffer(8)
  const buf2 = Buffer.from(arrBuf)
  console.log("ArrayBuffer works", buf2)
} catch (e) {
  console.log("ArrayBuffer failed", e)
}
