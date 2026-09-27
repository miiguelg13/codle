func topKFrequent(nums []int, k int) []int {
    count := make(map[int]int)
    for _, x := range nums {
        count[x]++
    }
    // buckets[f] = números que aparecen exactamente f veces
    buckets := make([][]int, len(nums)+1)
    for x, f := range count {
        buckets[f] = append(buckets[f], x)
    }
    result := make([]int, 0, k)
    for f := len(nums); f > 0; f-- {
        for _, x := range buckets[f] {
            result = append(result, x)
            if len(result) == k {
                return result
            }
        }
    }
    return result
}
