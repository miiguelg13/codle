class Solution {
    public long[] productExceptSelf(int[] nums) {
        int n = nums.length;
        long[] out = new long[n];
        long p = 1;
        for (int i = 0; i < n; i++) {
            out[i] = p;
            p *= nums[i];
        }
        p = 1;
        for (int i = n - 1; i >= 0; i--) {
            out[i] *= p;
            p *= nums[i];
        }
        return out;
    }
}
