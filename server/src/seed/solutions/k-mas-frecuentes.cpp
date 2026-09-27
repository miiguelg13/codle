class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        unordered_map<int, int> count;
        for (int x : nums) count[x]++;
        // buckets[f] = números que aparecen exactamente f veces
        vector<vector<int>> buckets(nums.size() + 1);
        for (auto& [x, f] : count) buckets[f].push_back(x);
        vector<int> result;
        for (int f = nums.size(); f > 0; f--) {
            for (int x : buckets[f]) {
                result.push_back(x);
                if ((int)result.size() == k) return result;
            }
        }
        return result;
    }
};
