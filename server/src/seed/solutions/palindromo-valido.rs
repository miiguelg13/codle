impl Solution {
    pub fn is_palindrome(s: String) -> bool {
        let b = s.as_bytes();
        if b.is_empty() {
            return true;
        }
        let (mut i, mut j) = (0, b.len() - 1);
        while i < j {
            if !b[i].is_ascii_alphanumeric() {
                i += 1;
            } else if !b[j].is_ascii_alphanumeric() {
                j -= 1;
            } else {
                if !b[i].eq_ignore_ascii_case(&b[j]) {
                    return false;
                }
                i += 1;
                j -= 1;
            }
        }
        true
    }
}
