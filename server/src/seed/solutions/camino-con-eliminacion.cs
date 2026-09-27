public class Solution {
    private static readonly int[,] Dirs = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } };

    public int ShortestPath(int[][] grid, int k) {
        int m = grid.Length, n = grid[0].Length;
        // best[i, j] = máximo de eliminaciones restantes con que hemos llegado a (i, j)
        var best = new int[m, n];
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++)
                best[i, j] = -1;
        var queue = new Queue<(int x, int y, int r, int d)>();
        queue.Enqueue((0, 0, k, 0));
        best[0, 0] = k;
        while (queue.Count > 0) {
            var (x, y, r, d) = queue.Dequeue();
            if (x == m - 1 && y == n - 1) return d;
            for (int i = 0; i < 4; i++) {
                int a = x + Dirs[i, 0], b = y + Dirs[i, 1];
                if (a < 0 || a >= m || b < 0 || b >= n) continue;
                int nr = r - grid[a][b];
                // Solo seguimos si llegamos con más eliminaciones que antes (y nunca con -1)
                if (nr > best[a, b]) {
                    best[a, b] = nr;
                    queue.Enqueue((a, b, nr, d + 1));
                }
            }
        }
        return -1;
    }
}
