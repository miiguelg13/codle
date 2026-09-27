impl Solution {
    pub fn top_k_frequent(nums: Vec<i32>, k: i32) -> Vec<i32> {
        let k = k as usize;
        let mut count: HashMap<i32, usize> = HashMap::new();
        for &x in &nums {
            *count.entry(x).or_insert(0) += 1;
        }
        // buckets[f] = números que aparecen exactamente f veces
        let mut buckets = vec![Vec::new(); nums.len() + 1];
        for (x, f) in count {
            buckets[f].push(x);
        }
        buckets.into_iter().rev().flatten().take(k).collect()
    }
}
