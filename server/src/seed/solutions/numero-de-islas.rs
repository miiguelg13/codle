impl Solution {
    pub fn num_islands(grid: Vec<String>) -> i32 {
        let grid: Vec<&[u8]> = grid.iter().map(|row| row.as_bytes()).collect();
        let (m, n) = (grid.len(), grid[0].len());
        let mut seen = vec![vec![false; n]; m];
        let mut count = 0;
        for i in 0..m {
            for j in 0..n {
                if grid[i][j] != b'1' || seen[i][j] {
                    continue;
                }
                // Tierra nueva: recorremos toda la isla con un DFS iterativo
                count += 1;
                seen[i][j] = true;
                let mut stack = vec![(i, j)];
                while let Some((x, y)) = stack.pop() {
                    // wrapping_sub en 0 da usize::MAX, que queda fuera del rango
                    let neighbors = [(x + 1, y), (x.wrapping_sub(1), y), (x, y + 1), (x, y.wrapping_sub(1))];
                    for (a, b) in neighbors {
                        if a < m && b < n && grid[a][b] == b'1' && !seen[a][b] {
                            seen[a][b] = true;
                            stack.push((a, b));
                        }
                    }
                }
            }
        }
        count
    }
}
