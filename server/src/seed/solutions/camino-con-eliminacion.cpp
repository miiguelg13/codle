class Solution {
public:
    int shortestPath(vector<vector<int>>& grid, int k) {
        int m = grid.size(), n = grid[0].size();
        // best[i][j] = máximo de eliminaciones restantes con que hemos llegado a (i, j)
        vector<vector<int>> best(m, vector<int>(n, -1));
        const int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        queue<array<int, 4>> q;
        q.push({0, 0, k, 0});
        best[0][0] = k;
        while (!q.empty()) {
            auto [x, y, r, d] = q.front();
            q.pop();
            if (x == m - 1 && y == n - 1) return d;
            for (auto& dir : dirs) {
                int a = x + dir[0], b = y + dir[1];
                if (a < 0 || a >= m || b < 0 || b >= n) continue;
                int nr = r - grid[a][b];
                // Solo seguimos si llegamos con más eliminaciones que antes (y nunca con -1)
                if (nr > best[a][b]) {
                    best[a][b] = nr;
                    q.push({a, b, nr, d + 1});
                }
            }
        }
        return -1;
    }
};
