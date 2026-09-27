impl Solution {
    pub fn median_sliding_window(nums: Vec<i32>, k: i32) -> Vec<f64> {
        let k = k as usize;
        // Ventana siempre ordenada: la mediana está en el centro
        let mut w = nums[..k].to_vec();
        w.sort();
        let mut result = Vec::with_capacity(nums.len() - k + 1);
        for i in k..=nums.len() {
            result.push(if k % 2 == 1 {
                w[k / 2] as f64
            } else {
                (w[k / 2 - 1] as f64 + w[k / 2] as f64) / 2.0
            });
            if i == nums.len() {
                break;
            }
            let out = w.partition_point(|&x| x < nums[i - k]);
            w.remove(out);
            let pos = w.partition_point(|&x| x < nums[i]);
            w.insert(pos, nums[i]);
        }
        result
    }
}
