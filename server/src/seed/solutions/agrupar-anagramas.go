import "sort"

func groupAnagrams(words []string) [][]string {
    groups := map[string][]string{}
    for _, w := range words {
        b := []byte(w)
        sort.Slice(b, func(i, j int) bool { return b[i] < b[j] })
        key := string(b)
        groups[key] = append(groups[key], w)
    }
    result := make([][]string, 0, len(groups))
    for _, group := range groups {
        result = append(result, group)
    }
    return result
}
