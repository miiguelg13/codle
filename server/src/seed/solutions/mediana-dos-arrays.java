class Solution {
    public double findMedianSortedArrays(int[] a, int[] b) {
        int[] c = new int[a.length + b.length];
        System.arraycopy(a, 0, c, 0, a.length);
        System.arraycopy(b, 0, c, a.length, b.length);
        Arrays.sort(c);
        int n = c.length;
        if (n % 2 == 1) return c[n / 2];
        return (c[n / 2 - 1] + c[n / 2]) / 2.0;
    }
}
