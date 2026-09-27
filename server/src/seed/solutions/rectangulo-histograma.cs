public class Solution {
    public int LargestRectangleArea(int[] heights) {
        int n = heights.Length;
        // Pila de (inicio, altura) con alturas crecientes
        var stack = new Stack<(int start, int height)>();
        int best = 0;
        for (int i = 0; i <= n; i++) {
            // Barra final de altura 0 para vaciar la pila
            int h = i < n ? heights[i] : 0;
            int start = i;
            while (stack.Count > 0 && stack.Peek().height >= h) {
                var top = stack.Pop();
                best = Math.Max(best, top.height * (i - top.start));
                start = top.start;
            }
            stack.Push((start, h));
        }
        return best;
    }
}
