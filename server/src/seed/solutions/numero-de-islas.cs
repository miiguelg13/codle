public class Solution {
    private static readonly int[,] Dirs = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } };

    public int NumIslands(string[] grid) {
        int m = grid.Length, n = grid[0].Length;
        var seen = new bool[m, n];
        int count = 0;
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (grid[i][j] != '1' || seen[i, j]) continue;
                // Tierra nueva: recorremos toda la isla con un DFS iterativo
                count++;
                seen[i, j] = true;
                var stack = new Stack<(int x, int y)>();
                stack.Push((i, j));
                while (stack.Count > 0) {
                    var (x, y) = stack.Pop();
                    for (int d = 0; d < 4; d++) {
                        int a = x + Dirs[d, 0], b = y + Dirs[d, 1];
                        if (a >= 0 && a < m && b >= 0 && b < n && grid[a][b] == '1' && !seen[a, b]) {
                            seen[a, b] = true;
                            stack.Push((a, b));
                        }
                    }
                }
            }
        }
        return count;
    }
}
