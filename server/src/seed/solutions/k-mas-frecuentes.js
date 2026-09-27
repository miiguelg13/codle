function topKFrequent(nums, k) {
    const count = new Map();
    for (const x of nums) count.set(x, (count.get(x) ?? 0) + 1);
    // buckets[f] = números que aparecen exactamente f veces
    const buckets = Array.from({ length: nums.length + 1 }, () => []);
    for (const [x, f] of count) buckets[f].push(x);
    const result = [];
    for (let f = nums.length; f > 0; f--) {
        for (const x of buckets[f]) {
            result.push(x);
            if (result.length === k) return result;
        }
    }
    return result;
}
