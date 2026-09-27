import "slices"

func medianSlidingWindow(nums []int, k int) []float64 {
    // Ventana siempre ordenada: la mediana está en el centro
    w := slices.Clone(nums[:k])
    slices.Sort(w)
    result := make([]float64, 0, len(nums)-k+1)
    for i := k; ; i++ {
        if k%2 == 1 {
            result = append(result, float64(w[k/2]))
        } else {
            result = append(result, float64(w[k/2-1]+w[k/2])/2)
        }
        if i == len(nums) {
            break
        }
        // BinarySearch devuelve la primera posición con valor >= x
        out, _ := slices.BinarySearch(w, nums[i-k])
        w = slices.Delete(w, out, out+1)
        pos, _ := slices.BinarySearch(w, nums[i])
        w = slices.Insert(w, pos, nums[i])
    }
    return result
}
