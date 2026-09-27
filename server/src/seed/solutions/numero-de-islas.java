class Solution {
    private static final int[][] DIRS = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};

    public int numIslands(String[] grid) {
        int m = grid.length, n = grid[0].length();
        boolean[][] seen = new boolean[m][n];
        int count = 0;
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (grid[i].charAt(j) != '1' || seen[i][j]) continue;
                // Tierra nueva: recorremos toda la isla con un DFS iterativo
                count++;
                seen[i][j] = true;
                Deque<int[]> stack = new ArrayDeque<>();
                stack.push(new int[]{i, j});
                while (!stack.isEmpty()) {
                    int[] cell = stack.pop();
                    for (int[] d : DIRS) {
                        int a = cell[0] + d[0], b = cell[1] + d[1];
                        if (a >= 0 && a < m && b >= 0 && b < n && grid[a].charAt(b) == '1' && !seen[a][b]) {
                            seen[a][b] = true;
                            stack.push(new int[]{a, b});
                        }
                    }
                }
            }
        }
        return count;
    }
}
