class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> count = new HashMap<>();
        for (int x : nums) count.merge(x, 1, Integer::sum);
        // buckets.get(f) = números que aparecen exactamente f veces
        List<List<Integer>> buckets = new ArrayList<>();
        for (int f = 0; f <= nums.length; f++) buckets.add(new ArrayList<>());
        for (Map.Entry<Integer, Integer> e : count.entrySet()) buckets.get(e.getValue()).add(e.getKey());
        int[] result = new int[k];
        int size = 0;
        for (int f = nums.length; f > 0; f--) {
            for (int x : buckets.get(f)) {
                result[size++] = x;
                if (size == k) return result;
            }
        }
        return result;
    }
}
