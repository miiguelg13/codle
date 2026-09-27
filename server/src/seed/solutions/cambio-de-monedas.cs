public class Solution {
    public int CoinChange(int[] coins, int amount) {
        // amount + 1 hace de "infinito": nunca se necesitan más de amount monedas
        int inf = amount + 1;
        var dp = new int[amount + 1];
        for (int a = 1; a <= amount; a++) {
            dp[a] = inf;
            foreach (int c in coins) {
                if (c <= a) dp[a] = Math.Min(dp[a], dp[a - c] + 1);
            }
        }
        return dp[amount] == inf ? -1 : dp[amount];
    }
}
