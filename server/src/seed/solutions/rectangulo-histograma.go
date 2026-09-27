func largestRectangleArea(heights []int) int {
    type bar struct{ start, height int }
    n := len(heights)
    // Pila de barras con alturas crecientes
    stack := []bar{}
    best := 0
    for i := 0; i <= n; i++ {
        // Barra final de altura 0 para vaciar la pila
        h := 0
        if i < n {
            h = heights[i]
        }
        start := i
        for len(stack) > 0 && stack[len(stack)-1].height >= h {
            top := stack[len(stack)-1]
            stack = stack[:len(stack)-1]
            best = max(best, top.height*(i-top.start))
            start = top.start
        }
        stack = append(stack, bar{start, h})
    }
    return best
}
