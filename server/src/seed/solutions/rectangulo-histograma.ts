function largestRectangleArea(heights: number[]): number {
    // Pila de [inicio, altura] con alturas crecientes
    const stack: [number, number][] = [];
    let best = 0;
    for (let i = 0; i <= heights.length; i++) {
        // Barra final de altura 0 para vaciar la pila
        const h = i < heights.length ? heights[i] : 0;
        let start = i;
        while (stack.length > 0 && stack[stack.length - 1][1] >= h) {
            const [idx, height] = stack.pop()!;
            best = Math.max(best, height * (i - idx));
            start = idx;
        }
        stack.push([start, h]);
    }
    return best;
}
