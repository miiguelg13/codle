class Solution {
public:
    double findMedianSortedArrays(vector<int>& a, vector<int>& b) {
        vector<int> c(a);
        c.insert(c.end(), b.begin(), b.end());
        sort(c.begin(), c.end());
        int n = c.size();
        if (n % 2 == 1) return c[n / 2];
        return (c[n / 2 - 1] + c[n / 2]) / 2.0;
    }
};
