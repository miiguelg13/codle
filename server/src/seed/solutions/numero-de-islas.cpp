class Solution {
public:
    int numIslands(vector<string>& grid) {
        int m = grid.size(), n = grid[0].size();
        vector<vector<bool>> seen(m, vector<bool>(n, false));
        const int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        int count = 0;
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (grid[i][j] != '1' || seen[i][j]) continue;
                // Tierra nueva: recorremos toda la isla con un DFS iterativo
                count++;
                seen[i][j] = true;
                vector<pair<int, int>> stack = {{i, j}};
                while (!stack.empty()) {
                    auto [x, y] = stack.back();
                    stack.pop_back();
                    for (auto& d : dirs) {
                        int a = x + d[0], b = y + d[1];
                        if (a >= 0 && a < m && b >= 0 && b < n && grid[a][b] == '1' && !seen[a][b]) {
                            seen[a][b] = true;
                            stack.push_back({a, b});
                        }
                    }
                }
            }
        }
        return count;
    }
};
