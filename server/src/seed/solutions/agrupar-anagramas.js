function groupAnagrams(words) {
    const groups = new Map();
    for (const w of words) {
        const key = [...w].sort().join('');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(w);
    }
    return [...groups.values()];
}
