class Solution {
    public double[] medianSlidingWindow(int[] nums, int k) {
        int n = nums.length;
        // Ventana siempre ordenada: la mediana está en el centro
        int[] first = Arrays.copyOf(nums, k);
        Arrays.sort(first);
        List<Integer> w = new ArrayList<>();
        for (int x : first) w.add(x);
        double[] result = new double[n - k + 1];
        for (int i = k; ; i++) {
            result[i - k] = k % 2 == 1 ? w.get(k / 2) : ((double) w.get(k / 2 - 1) + w.get(k / 2)) / 2;
            if (i == n) break;
            // binarySearch devuelve la posición si lo encuentra, o -(inserción) - 1 si no
            w.remove(Collections.binarySearch(w, nums[i - k]));
            int pos = Collections.binarySearch(w, nums[i]);
            w.add(pos >= 0 ? pos : -pos - 1, nums[i]);
        }
        return result;
    }
}
