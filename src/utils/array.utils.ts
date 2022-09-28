export function chuckArray<T>(items: T[], chunkSize: number): T[][] {
  return Array.from(
    { length: Math.ceil(items.length / chunkSize) },
    (_, index) => items.slice(index * chunkSize, (index + 1) * chunkSize)
  );
}
