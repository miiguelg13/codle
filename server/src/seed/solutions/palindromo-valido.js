function isPalindrome(s) {
    const isAlnum = (c) => /[a-z0-9]/i.test(c);
    let i = 0;
    let j = s.length - 1;
    while (i < j) {
        if (!isAlnum(s[i])) {
            i++;
        } else if (!isAlnum(s[j])) {
            j--;
        } else {
            if (s[i].toLowerCase() !== s[j].toLowerCase()) return false;
            i++;
            j--;
        }
    }
    return true;
}
