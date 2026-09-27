class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Claves long: target - x puede salirse del rango de int
        Map<Long, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            Integer j = seen.get((long) target - nums[i]);
            if (j != null) return new int[] { j, i };
            seen.put((long) nums[i], i);
        }
        return new int[0];
    }
}
