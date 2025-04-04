import { Duplex, Readable, Writable } from "stream";

export function createStreamBridge(): Duplex {
  // Create a duplex stream that can be both read from and written to
  const bridge = new Duplex({
    write(
      chunk: Buffer | string,
      encoding: BufferEncoding,
      callback: (error?: Error | null) => void
    ): void {
      // When data is written to this stream, push it to the readable side
      bridge.push(chunk);
      callback();
    },
    read(size: number): void {
      // The read implementation is handled by the push method in write()
    },
    final(callback: (error?: Error | null) => void): void {
      // When writing is done, signal end of the readable stream
      bridge.push(null);
      callback();
    },
  });

  return bridge;
}
