public class Solution {
    public double FindMedianSortedArrays(int[] a, int[] b) {
        int[] c = a.Concat(b).ToArray();
        Array.Sort(c);
        int n = c.Length;
        if (n % 2 == 1) return c[n / 2];
        return (c[n / 2 - 1] + c[n / 2]) / 2.0;
    }
}
