public class Solution {
    public long[] ProductExceptSelf(int[] nums) {
        int n = nums.Length;
        var output = new long[n];
        long p = 1;
        for (int i = 0; i < n; i++) {
            output[i] = p;
            p *= nums[i];
        }
        p = 1;
        for (int i = n - 1; i >= 0; i--) {
            output[i] *= p;
            p *= nums[i];
        }
        return output;
    }
}
