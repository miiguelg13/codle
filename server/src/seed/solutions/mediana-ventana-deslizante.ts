function medianSlidingWindow(nums: number[], k: number): number[] {
    // Primera posición de w cuyo valor es >= x (búsqueda binaria)
    const lowerBound = (w: number[], x: number): number => {
        let lo = 0, hi = w.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (w[mid] < x) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    };
    // Ventana siempre ordenada: la mediana está en el centro
    const w = nums.slice(0, k).sort((a, b) => a - b);
    const result: number[] = [];
    for (let i = k; ; i++) {
        result.push(k % 2 === 1 ? w[k >> 1] : (w[k / 2 - 1] + w[k / 2]) / 2);
        if (i === nums.length) break;
        w.splice(lowerBound(w, nums[i - k]), 1);
        w.splice(lowerBound(w, nums[i]), 0, nums[i]);
    }
    return result;
}
