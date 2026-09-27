impl Solution {
    pub fn largest_rectangle_area(heights: Vec<i32>) -> i32 {
        // Pila de (inicio, altura) con alturas crecientes
        let mut stack: Vec<(usize, i32)> = Vec::new();
        let mut best = 0;
        // Barra final de altura 0 para vaciar la pila
        for (i, h) in heights.into_iter().chain([0]).enumerate() {
            let mut start = i;
            while let Some(&(idx, height)) = stack.last() {
                if height < h {
                    break;
                }
                stack.pop();
                best = best.max(height * (i - idx) as i32);
                start = idx;
            }
            stack.push((start, h));
        }
        best
    }
}
