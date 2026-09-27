class Solution {
public:
    int largestRectangleArea(vector<int>& heights) {
        int n = heights.size();
        // Pila de (inicio, altura) con alturas crecientes
        vector<pair<int, int>> stack;
        int best = 0;
        for (int i = 0; i <= n; i++) {
            // Barra final de altura 0 para vaciar la pila
            int h = i < n ? heights[i] : 0;
            int start = i;
            while (!stack.empty() && stack.back().second >= h) {
                auto [idx, height] = stack.back();
                stack.pop_back();
                best = max(best, height * (i - idx));
                start = idx;
            }
            stack.push_back({start, h});
        }
        return best;
    }
};
