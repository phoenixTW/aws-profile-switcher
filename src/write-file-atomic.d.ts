declare module 'write-file-atomic' {
  export default function writeFileAtomic(
    filename: string,
    data: string,
  ): Promise<void>;
}
