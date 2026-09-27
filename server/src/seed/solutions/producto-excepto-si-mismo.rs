impl Solution {
    pub fn product_except_self(nums: Vec<i32>) -> Vec<i64> {
        let n = nums.len();
        let mut out = vec![1i64; n];
        let mut p: i64 = 1;
        for i in 0..n {
            out[i] = p;
            p *= nums[i] as i64;
        }
        p = 1;
        for i in (0..n).rev() {
            out[i] *= p;
            p *= nums[i] as i64;
        }
        out
    }
}
