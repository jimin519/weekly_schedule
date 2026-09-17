type TimeRange = { startMinutes: number; endMinutes: number };

export type LayoutedBlock<T extends TimeRange> = T & {
  column: number;
  columnCount: number;
};

/**
 * 겹치는 시간대의 블록들을 나란히 배치하기 위해 column/columnCount를 계산한다.
 * 서로 겹치는 블록들을 클러스터로 묶고, 클러스터 안에서는 그리디하게 열을 배정한다.
 */
export function layoutOverlappingBlocks<T extends TimeRange>(
  blocks: T[],
): LayoutedBlock<T>[] {
  const sorted = [...blocks].sort(
    (a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes,
  );

  const result: LayoutedBlock<T>[] = [];
  let cluster: T[] = [];
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const columnEnds: number[] = [];
    const assigned: Array<T & { column: number }> = [];

    for (const block of cluster) {
      let column = columnEnds.findIndex((end) => end <= block.startMinutes);
      if (column === -1) {
        column = columnEnds.length;
        columnEnds.push(block.endMinutes);
      } else {
        columnEnds[column] = block.endMinutes;
      }
      assigned.push({ ...block, column });
    }

    const columnCount = columnEnds.length;
    for (const block of assigned) {
      result.push({ ...block, columnCount });
    }
    cluster = [];
  };

  for (const block of sorted) {
    if (cluster.length > 0 && block.startMinutes >= clusterEnd) {
      flushCluster();
      clusterEnd = -Infinity;
    }
    cluster.push(block);
    clusterEnd = Math.max(clusterEnd, block.endMinutes);
  }
  flushCluster();

  return result;
}
