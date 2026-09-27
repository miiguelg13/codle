import "sort"

func findMedianSortedArrays(a []int, b []int) float64 {
    c := append(append([]int{}, a...), b...)
    sort.Ints(c)
    n := len(c)
    if n%2 == 1 {
        return float64(c[n/2])
    }
    return float64(c[n/2-1]+c[n/2]) / 2
}
