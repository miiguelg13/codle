func numIslands(grid []string) int {
    m, n := len(grid), len(grid[0])
    seen := make([][]bool, m)
    for i := range seen {
        seen[i] = make([]bool, n)
    }
    dirs := [][2]int{{1, 0}, {-1, 0}, {0, 1}, {0, -1}}
    count := 0
    for i := 0; i < m; i++ {
        for j := 0; j < n; j++ {
            if grid[i][j] != '1' || seen[i][j] {
                continue
            }
            // Tierra nueva: recorremos toda la isla con un DFS iterativo
            count++
            seen[i][j] = true
            stack := [][2]int{{i, j}}
            for len(stack) > 0 {
                cell := stack[len(stack)-1]
                stack = stack[:len(stack)-1]
                for _, d := range dirs {
                    a, b := cell[0]+d[0], cell[1]+d[1]
                    if a >= 0 && a < m && b >= 0 && b < n && grid[a][b] == '1' && !seen[a][b] {
                        seen[a][b] = true
                        stack = append(stack, [2]int{a, b})
                    }
                }
            }
        }
    }
    return count
}
