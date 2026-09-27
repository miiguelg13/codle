class Solution {
    public int largestRectangleArea(int[] heights) {
        int n = heights.length;
        // Pila de {inicio, altura} con alturas crecientes
        Deque<int[]> stack = new ArrayDeque<>();
        int best = 0;
        for (int i = 0; i <= n; i++) {
            // Barra final de altura 0 para vaciar la pila
            int h = i < n ? heights[i] : 0;
            int start = i;
            while (!stack.isEmpty() && stack.peek()[1] >= h) {
                int[] top = stack.pop();
                best = Math.max(best, top[1] * (i - top[0]));
                start = top[0];
            }
            stack.push(new int[]{start, h});
        }
        return best;
    }
}
