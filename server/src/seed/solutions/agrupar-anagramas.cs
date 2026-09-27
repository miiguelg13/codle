public class Solution {
    public string[][] GroupAnagrams(string[] words) {
        var groups = new Dictionary<string, List<string>>();
        foreach (string w in words) {
            char[] chars = w.ToCharArray();
            Array.Sort(chars);
            string key = new string(chars);
            if (!groups.ContainsKey(key)) groups[key] = new List<string>();
            groups[key].Add(w);
        }
        return groups.Values.Select(g => g.ToArray()).ToArray();
    }
}
