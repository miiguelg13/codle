class Solution {
    public int coinChange(int[] coins, int amount) {
        // amount + 1 hace de "infinito": nunca se necesitan más de amount monedas
        int inf = amount + 1;
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, inf);
        dp[0] = 0;
        for (int a = 1; a <= amount; a++) {
            for (int c : coins) {
                if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
            }
        }
        return dp[amount] == inf ? -1 : dp[amount];
    }
}
