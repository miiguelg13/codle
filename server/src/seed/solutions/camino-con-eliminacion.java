class Solution {
    private static final int[][] DIRS = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};

    public int shortestPath(int[][] grid, int k) {
        int m = grid.length, n = grid[0].length;
        // best[i][j] = máximo de eliminaciones restantes con que hemos llegado a (i, j)
        int[][] best = new int[m][n];
        for (int[] row : best) Arrays.fill(row, -1);
        Deque<int[]> queue = new ArrayDeque<>();
        queue.add(new int[]{0, 0, k, 0});
        best[0][0] = k;
        while (!queue.isEmpty()) {
            int[] s = queue.poll();
            int x = s[0], y = s[1], r = s[2], d = s[3];
            if (x == m - 1 && y == n - 1) return d;
            for (int[] dir : DIRS) {
                int a = x + dir[0], b = y + dir[1];
                if (a < 0 || a >= m || b < 0 || b >= n) continue;
                int nr = r - grid[a][b];
                // Solo seguimos si llegamos con más eliminaciones que antes (y nunca con -1)
                if (nr > best[a][b]) {
                    best[a][b] = nr;
                    queue.add(new int[]{a, b, nr, d + 1});
                }
            }
        }
        return -1;
    }
}
