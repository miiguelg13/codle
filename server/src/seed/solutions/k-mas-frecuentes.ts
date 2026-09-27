function topKFrequent(nums: number[], k: number): number[] {
    const count = new Map<number, number>();
    for (const x of nums) count.set(x, (count.get(x) ?? 0) + 1);
    // buckets[f] = números que aparecen exactamente f veces
    const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);
    for (const [x, f] of count) buckets[f].push(x);
    const result: number[] = [];
    for (let f = nums.length; f > 0; f--) {
        for (const x of buckets[f]) {
            result.push(x);
            if (result.length === k) return result;
        }
    }
    return result;
}
