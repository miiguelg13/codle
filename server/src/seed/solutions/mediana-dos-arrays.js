function findMedianSortedArrays(a, b) {
    const c = [...a, ...b].sort((x, y) => x - y);
    const n = c.length;
    if (n % 2 === 1) return c[(n - 1) / 2];
    return (c[n / 2 - 1] + c[n / 2]) / 2;
}
