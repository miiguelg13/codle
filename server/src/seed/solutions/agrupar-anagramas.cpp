class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& words) {
        unordered_map<string, vector<string>> groups;
        for (const string& w : words) {
            string key = w;
            sort(key.begin(), key.end());
            groups[key].push_back(w);
        }
        vector<vector<string>> result;
        for (auto& [key, group] : groups) {
            result.push_back(move(group));
        }
        return result;
    }
};
