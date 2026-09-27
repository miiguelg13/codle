public class Solution {
    public int[] TwoSum(int[] nums, int target) {
        // Claves long: target - x puede salirse del rango de int
        var seen = new Dictionary<long, int>();
        for (int i = 0; i < nums.Length; i++) {
            int j;
            if (seen.TryGetValue((long) target - nums[i], out j)) return new[] { j, i };
            seen[nums[i]] = i;
        }
        return new int[0];
    }
}
