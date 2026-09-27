impl Solution {
    pub fn find_median_sorted_arrays(a: Vec<i32>, b: Vec<i32>) -> f64 {
        let mut c = [a, b].concat();
        c.sort_unstable();
        let n = c.len();
        if n % 2 == 1 {
            c[n / 2] as f64
        } else {
            (c[n / 2 - 1] as f64 + c[n / 2] as f64) / 2.0
        }
    }
}
