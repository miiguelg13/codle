impl Solution {
    pub fn group_anagrams(words: Vec<String>) -> Vec<Vec<String>> {
        let mut groups: HashMap<Vec<u8>, Vec<String>> = HashMap::new();
        for w in words {
            let mut key = w.as_bytes().to_vec();
            key.sort_unstable();
            groups.entry(key).or_default().push(w);
        }
        groups.into_values().collect()
    }
}
