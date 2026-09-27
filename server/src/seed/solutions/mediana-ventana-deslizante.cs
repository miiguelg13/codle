public class Solution {
    public double[] MedianSlidingWindow(int[] nums, int k) {
        int n = nums.Length;
        // Ventana siempre ordenada: la mediana está en el centro
        var w = new List<int>(nums.Take(k));
        w.Sort();
        var result = new double[n - k + 1];
        for (int i = k; ; i++) {
            result[i - k] = k % 2 == 1 ? w[k / 2] : ((double)w[k / 2 - 1] + w[k / 2]) / 2;
            if (i == n) break;
            // BinarySearch devuelve la posición si lo encuentra, o ~(inserción) si no
            w.RemoveAt(w.BinarySearch(nums[i - k]));
            int pos = w.BinarySearch(nums[i]);
            w.Insert(pos >= 0 ? pos : ~pos, nums[i]);
        }
        return result;
    }
}
