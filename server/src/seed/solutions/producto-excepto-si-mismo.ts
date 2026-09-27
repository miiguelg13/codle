function productExceptSelf(nums: number[]): number[] {
    const n = nums.length;
    const out: number[] = new Array(n).fill(1);
    let p = 1;
    for (let i = 0; i < n; i++) {
        out[i] = p;
        p *= nums[i];
    }
    p = 1;
    for (let i = n - 1; i >= 0; i--) {
        out[i] *= p;
        p *= nums[i];
    }
    return out;
}
