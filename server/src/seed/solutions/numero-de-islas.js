function numIslands(grid) {
    const m = grid.length, n = grid[0].length;
    const seen = Array.from({ length: m }, () => new Array(n).fill(false));
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let count = 0;
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            if (grid[i][j] !== '1' || seen[i][j]) continue;
            // Tierra nueva: recorremos toda la isla con un DFS iterativo
            count++;
            seen[i][j] = true;
            const stack = [[i, j]];
            while (stack.length > 0) {
                const [x, y] = stack.pop();
                for (const [dx, dy] of dirs) {
                    const a = x + dx, b = y + dy;
                    if (a >= 0 && a < m && b >= 0 && b < n && grid[a][b] === '1' && !seen[a][b]) {
                        seen[a][b] = true;
                        stack.push([a, b]);
                    }
                }
            }
        }
    }
    return count;
}
