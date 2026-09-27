func coinChange(coins []int, amount int) int {
    // amount + 1 hace de "infinito": nunca se necesitan más de amount monedas
    inf := amount + 1
    dp := make([]int, amount+1)
    for a := 1; a <= amount; a++ {
        dp[a] = inf
        for _, c := range coins {
            if c <= a && dp[a-c]+1 < dp[a] {
                dp[a] = dp[a-c] + 1
            }
        }
    }
    if dp[amount] == inf {
        return -1
    }
    return dp[amount]
}
