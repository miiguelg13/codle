function shortestPath(grid, k) {
    const m = grid.length, n = grid[0].length;
    // best[i][j] = máximo de eliminaciones restantes con que hemos llegado a (i, j)
    const best = Array.from({ length: m }, () => new Array(n).fill(-1));
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const queue = [[0, 0, k, 0]];
    best[0][0] = k;
    for (let head = 0; head < queue.length; head++) {
        const [x, y, r, d] = queue[head];
        if (x === m - 1 && y === n - 1) return d;
        for (const [dx, dy] of dirs) {
            const a = x + dx, b = y + dy;
            if (a < 0 || a >= m || b < 0 || b >= n) continue;
            const nr = r - grid[a][b];
            // Solo seguimos si llegamos con más eliminaciones que antes (y nunca con -1)
            if (nr > best[a][b]) {
                best[a][b] = nr;
                queue.push([a, b, nr, d + 1]);
            }
        }
    }
    return -1;
}
