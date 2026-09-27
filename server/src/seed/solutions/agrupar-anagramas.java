class Solution {
    public String[][] groupAnagrams(String[] words) {
        Map<String, List<String>> groups = new LinkedHashMap<>();
        for (String w : words) {
            char[] chars = w.toCharArray();
            Arrays.sort(chars);
            groups.computeIfAbsent(new String(chars), k -> new ArrayList<>()).add(w);
        }
        String[][] result = new String[groups.size()][];
        int i = 0;
        for (List<String> group : groups.values()) {
            result[i++] = group.toArray(new String[0]);
        }
        return result;
    }
}
