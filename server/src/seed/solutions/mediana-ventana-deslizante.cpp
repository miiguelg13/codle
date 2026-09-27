class Solution {
public:
    vector<double> medianSlidingWindow(vector<int>& nums, int k) {
        int n = nums.size();
        // Ventana siempre ordenada: la mediana está en el centro
        vector<int> w(nums.begin(), nums.begin() + k);
        sort(w.begin(), w.end());
        vector<double> result;
        for (int i = k; ; i++) {
            result.push_back(k % 2 == 1 ? w[k / 2] : ((double)w[k / 2 - 1] + w[k / 2]) / 2);
            if (i == n) break;
            w.erase(lower_bound(w.begin(), w.end(), nums[i - k]));
            w.insert(lower_bound(w.begin(), w.end(), nums[i]), nums[i]);
        }
        return result;
    }
};
