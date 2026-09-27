function groupAnagrams(words: string[]): string[][] {
    const groups = new Map<string, string[]>();
    for (const w of words) {
        const key = [...w].sort().join('');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(w);
    }
    return [...groups.values()];
}
