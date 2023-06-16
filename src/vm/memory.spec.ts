test("bytes to number test", () => {
  const bytes = new Uint8Array([
    0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
  ]);

  const offset = new Uint32Array(bytes.slice(0, 4).buffer)[0];
  const capacity = new Uint32Array(bytes.slice(4, 8).buffer)[0];
  const length = new Uint32Array(bytes.slice(8, 12).buffer)[0];

  expect(offset).toBe(65536);
  expect(capacity).toBe(1);
  expect(length).toBe(256);
});
