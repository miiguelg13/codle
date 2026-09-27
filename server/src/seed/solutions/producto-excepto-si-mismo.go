func productExceptSelf(nums []int) []int {
    n := len(nums)
    out := make([]int, n)
    p := 1
    for i := 0; i < n; i++ {
        out[i] = p
        p *= nums[i]
    }
    p = 1
    for i := n - 1; i >= 0; i-- {
        out[i] *= p
        p *= nums[i]
    }
    return out
}
