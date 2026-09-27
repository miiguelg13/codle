impl Solution {
    pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
        // Claves i64: target - x puede salirse del rango de i32
        let mut seen: HashMap<i64, i32> = HashMap::new();
        for (i, &x) in nums.iter().enumerate() {
            if let Some(&j) = seen.get(&(target as i64 - x as i64)) {
                return vec![j, i as i32];
            }
            seen.insert(x as i64, i as i32);
        }
        vec![]
    }
}
