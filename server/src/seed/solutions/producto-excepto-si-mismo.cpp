class Solution {
public:
    vector<long long> productExceptSelf(vector<int>& nums) {
        int n = nums.size();
        vector<long long> out(n);
        long long p = 1;
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
};
