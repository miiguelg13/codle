impl Solution {
    pub fn shortest_path(grid: Vec<Vec<i32>>, k: i32) -> i32 {
        let (m, n) = (grid.len(), grid[0].len());
        // best[i][j] = máximo de eliminaciones restantes con que hemos llegado a (i, j)
        let mut best = vec![vec![-1; n]; m];
        let mut queue = VecDeque::from([(0usize, 0usize, k, 0)]);
        best[0][0] = k;
        while let Some((x, y, r, d)) = queue.pop_front() {
            if x == m - 1 && y == n - 1 {
                return d;
            }
            // wrapping_sub en 0 da usize::MAX, que queda fuera del rango
            let neighbors = [(x + 1, y), (x.wrapping_sub(1), y), (x, y + 1), (x, y.wrapping_sub(1))];
            for (a, b) in neighbors {
                if a >= m || b >= n {
                    continue;
                }
                let nr = r - grid[a][b];
                // Solo seguimos si llegamos con más eliminaciones que antes (y nunca con -1)
                if nr > best[a][b] {
                    best[a][b] = nr;
                    queue.push_back((a, b, nr, d + 1));
                }
            }
        }
        -1
    }
}
