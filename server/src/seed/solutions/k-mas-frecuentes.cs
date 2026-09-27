public class Solution {
    public int[] TopKFrequent(int[] nums, int k) {
        var count = new Dictionary<int, int>();
        foreach (int x in nums) {
            count.TryGetValue(x, out int c);
            count[x] = c + 1;
        }
        // buckets[f] = números que aparecen exactamente f veces
        var buckets = new List<int>[nums.Length + 1];
        for (int f = 0; f <= nums.Length; f++) buckets[f] = new List<int>();
        foreach (var e in count) buckets[e.Value].Add(e.Key);
        var result = new List<int>(k);
        for (int f = nums.Length; f > 0; f--) {
            foreach (int x in buckets[f]) {
                result.Add(x);
                if (result.Count == k) return result.ToArray();
            }
        }
        return result.ToArray();
    }
}
