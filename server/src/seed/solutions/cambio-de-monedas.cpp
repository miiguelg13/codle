class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        // amount + 1 hace de "infinito": nunca se necesitan más de amount monedas
        const int inf = amount + 1;
        vector<int> dp(amount + 1, inf);
        dp[0] = 0;
        for (int a = 1; a <= amount; a++) {
            for (int c : coins) {
                if (c <= a) dp[a] = min(dp[a], dp[a - c] + 1);
            }
        }
        return dp[amount] == inf ? -1 : dp[amount];
    }
};
