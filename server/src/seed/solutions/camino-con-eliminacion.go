func shortestPath(grid [][]int, k int) int {
    m, n := len(grid), len(grid[0])
    // best[i][j] = máximo de eliminaciones restantes con que hemos llegado a (i, j)
    best := make([][]int, m)
    for i := range best {
        best[i] = make([]int, n)
        for j := range best[i] {
            best[i][j] = -1
        }
    }
    type state struct{ x, y, r, d int }
    dirs := [][2]int{{1, 0}, {-1, 0}, {0, 1}, {0, -1}}
    queue := []state{{0, 0, k, 0}}
    best[0][0] = k
    for head := 0; head < len(queue); head++ {
        s := queue[head]
        if s.x == m-1 && s.y == n-1 {
            return s.d
        }
        for _, dir := range dirs {
            a, b := s.x+dir[0], s.y+dir[1]
            if a < 0 || a >= m || b < 0 || b >= n {
                continue
            }
            nr := s.r - grid[a][b]
            // Solo seguimos si llegamos con más eliminaciones que antes (y nunca con -1)
            if nr > best[a][b] {
                best[a][b] = nr
                queue = append(queue, state{a, b, nr, s.d + 1})
            }
        }
    }
    return -1
}
