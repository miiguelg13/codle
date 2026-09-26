"""
Genera server/src/seed/problems.json a partir de las definiciones de abajo.

Cada problema lleva una solución de referencia en Python: este script la
ejecuta para calcular la salida esperada de cada test, así nunca escribimos
salidas a mano. Uso:

    python server/src/seed/generate_seed.py
"""
import json
import os
import random

random.seed(20260926)

PROBLEMS = []


def problem(**kw):
    PROBLEMS.append(kw)


def run_reference(p):
    ns = {}
    exec(p["reference"], ns)
    fn = getattr(ns["Solution"](), p["signature"]["functionName"])
    for group in ("examples", "tests"):
        for t in p[group]:
            args = json.loads(json.dumps(t["input"]))  # copia profunda
            t["output"] = fn(*args)


problem(
    slug="palindromo-valido",
    dayOffset=-2,
    level=1,
    title={"es": "Palíndromo válido", "en": "Valid Palindrome"},
    statement={
        "es": "Dada una cadena `s`, devuelve `true` si es un **palíndromo** después de convertir todas las letras a minúsculas y eliminar todos los caracteres que no sean alfanuméricos (letras ASCII y dígitos).\n\nEn caso contrario, devuelve `false`.",
        "en": "Given a string `s`, return `true` if it is a **palindrome** after converting all letters to lowercase and removing every non-alphanumeric character (ASCII letters and digits).\n\nOtherwise, return `false`.",
    },
    constraints=["0 <= s.length <= 2 * 10^5", "s contiene caracteres ASCII imprimibles / s consists of printable ASCII characters"],
    signature={"functionName": "isPalindrome", "params": [{"name": "s", "type": "string"}], "returnType": "bool"},
    compare="exact",
    examples=[
        {"input": ["A man, a plan, a canal: Panama"], "explanation": {"es": "\"amanaplanacanalpanama\" se lee igual en ambos sentidos.", "en": "\"amanaplanacanalpanama\" reads the same both ways."}},
        {"input": ["race a car"], "explanation": {"es": "\"raceacar\" no es un palíndromo.", "en": "\"raceacar\" is not a palindrome."}},
        {"input": [" "]},
    ],
    tests=[{"input": [s]} for s in [
        "", "a", "ab", "aa", "0P", "Was it a car or a cat I saw?", "No 'x' in Nixon", "abcba", "abccba", "abcda",
        ".,;:!", "1a2", "1a1", "Madam, in Eden, I'm Adam",
        "ab" * 50000 + "a", "ab" * 50000,
    ]],
    reference="""
class Solution:
    def isPalindrome(self, s):
        t = [c.lower() for c in s if c.isascii() and c.isalnum()]
        return t == t[::-1]
""",
)

problem(
    slug="agrupar-anagramas",
    dayOffset=-2,
    level=2,
    title={"es": "Agrupar anagramas", "en": "Group Anagrams"},
    statement={
        "es": "Dado un array de cadenas `words`, agrupa los **anagramas** entre sí. Dos palabras son anagramas si contienen exactamente las mismas letras con la misma frecuencia.\n\nPuedes devolver los grupos **en cualquier orden**, y las palabras dentro de cada grupo también en cualquier orden.",
        "en": "Given an array of strings `words`, group the **anagrams** together. Two words are anagrams if they contain exactly the same letters with the same frequencies.\n\nYou may return the groups **in any order**, and the words inside each group in any order as well.",
    },
    constraints=["1 <= words.length <= 10^4", "0 <= words[i].length <= 100", "words[i] solo contiene minúsculas / only lowercase letters"],
    signature={"functionName": "groupAnagrams", "params": [{"name": "words", "type": "string[]"}], "returnType": "string[][]"},
    compare="unordered-deep",
    examples=[
        {"input": [["eat", "tea", "tan", "ate", "nat", "bat"]]},
        {"input": [[""]]},
        {"input": [["a"]]},
    ],
    tests=[
        {"input": [["abc", "bca", "cab", "xyz", "zyx", "q"]]},
        {"input": [["", "", "a"]]},
        {"input": [["ab", "ba", "ab"]]},
        {"input": [["listen", "silent", "enlist", "google", "gooegl", "cat", "act", "tac", "dog"]]},
        {"input": [["aab", "aba", "baa", "abb", "bab"]]},
        {"input": [[''.join(random.choice('abc') for _ in range(random.randint(0, 6))) for _ in range(300)]]},
        {"input": [[''.join(random.choice('abcdefghij') for _ in range(random.randint(1, 12))) for _ in range(10000)]]},
    ],
    reference="""
class Solution:
    def groupAnagrams(self, words):
        g = {}
        for w in words:
            g.setdefault(''.join(sorted(w)), []).append(w)
        return list(g.values())
""",
)

problem(
    slug="cambio-de-monedas",
    dayOffset=-2,
    level=3,
    title={"es": "Cambio de monedas", "en": "Coin Change"},
    statement={
        "es": "Tienes un array `coins` con los valores de distintas monedas y un entero `amount` que representa una cantidad de dinero.\n\nDevuelve el **mínimo número de monedas** necesarias para sumar exactamente `amount`. Si no es posible formar esa cantidad, devuelve `-1`.\n\nDispones de una cantidad ilimitada de monedas de cada tipo.",
        "en": "You are given an array `coins` with the values of different coins and an integer `amount` representing a sum of money.\n\nReturn the **fewest number of coins** needed to make up exactly `amount`. If that amount cannot be made, return `-1`.\n\nYou have an unlimited number of each kind of coin.",
    },
    constraints=["1 <= coins.length <= 12", "1 <= coins[i] <= 2^31 - 1", "0 <= amount <= 10^4"],
    signature={"functionName": "coinChange", "params": [{"name": "coins", "type": "int[]"}, {"name": "amount", "type": "int"}], "returnType": "int"},
    compare="exact",
    examples=[
        {"input": [[1, 2, 5], 11], "explanation": {"es": "11 = 5 + 5 + 1", "en": "11 = 5 + 5 + 1"}},
        {"input": [[2], 3]},
        {"input": [[1], 0]},
    ],
    tests=[{"input": t} for t in [
        [[1], 1], [[2], 1], [[3, 7], 5], [[186, 419, 83, 408], 6249], [[2, 5, 10, 1], 27],
        [[1, 2147483647], 2], [[5, 10, 25], 30], [[7, 11], 10000], [[1, 3, 4], 6],
        [[474, 83, 404, 3], 264], [[2, 4, 6, 8], 9999], [[1, 5, 10, 25, 50, 100], 10000],
    ]],
    reference="""
class Solution:
    def coinChange(self, coins, amount):
        INF = float('inf')
        dp = [0] + [INF] * amount
        for a in range(1, amount + 1):
            for c in coins:
                if c <= a and dp[a - c] + 1 < dp[a]:
                    dp[a] = dp[a - c] + 1
        return -1 if dp[amount] == INF else dp[amount]
""",
)

problem(
    slug="mediana-dos-arrays",
    dayOffset=-2,
    level=4,
    title={"es": "Mediana de dos arrays ordenados", "en": "Median of Two Sorted Arrays"},
    statement={
        "es": "Dados dos arrays ordenados de forma ascendente `a` y `b`, de tamaños `m` y `n`, devuelve la **mediana** de la unión de ambos.\n\nSi el número total de elementos es par, la mediana es la media de los dos elementos centrales.\n\n**Reto:** consigue una complejidad `O(log(m + n))`.",
        "en": "Given two arrays `a` and `b` sorted in ascending order, of sizes `m` and `n`, return the **median** of the two arrays combined.\n\nIf the total number of elements is even, the median is the mean of the two middle elements.\n\n**Challenge:** achieve `O(log(m + n))` complexity.",
    },
    constraints=["0 <= m, n <= 10^5", "1 <= m + n", "-10^6 <= a[i], b[i] <= 10^6"],
    signature={"functionName": "findMedianSortedArrays", "params": [{"name": "a", "type": "int[]"}, {"name": "b", "type": "int[]"}], "returnType": "double"},
    compare="exact",
    examples=[
        {"input": [[1, 3], [2]], "explanation": {"es": "Unión = [1,2,3], mediana = 2.", "en": "Merged = [1,2,3], median = 2."}},
        {"input": [[1, 2], [3, 4]], "explanation": {"es": "Unión = [1,2,3,4], mediana = (2 + 3) / 2 = 2.5.", "en": "Merged = [1,2,3,4], median = (2 + 3) / 2 = 2.5."}},
    ],
    tests=[{"input": t} for t in [
        [[], [1]], [[2], []], [[0, 0], [0, 0]], [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]],
        [[-5, -3, -1], [-2]], [[1], [2, 3, 4, 5, 6]], [[1000000], [-1000000]],
        [sorted(random.randint(-10**6, 10**6) for _ in range(99999)), sorted(random.randint(-10**6, 10**6) for _ in range(100000))],
        [sorted(random.randint(-100, 100) for _ in range(50000)), []],
    ]],
    reference="""
class Solution:
    def findMedianSortedArrays(self, a, b):
        c = sorted(a + b)
        n = len(c)
        if n % 2:
            return float(c[n // 2])
        return (c[n // 2 - 1] + c[n // 2]) / 2
""",
)


problem(
    slug="dos-sumas",
    dayOffset=-1,
    level=1,
    title={"es": "Dos sumas", "en": "Two Sum"},
    statement={
        "es": "Dado un array de enteros `nums` y un entero `target`, devuelve los **índices** de los dos números que suman `target`.\n\nCada entrada tiene **exactamente una solución** y no puedes usar el mismo elemento dos veces. Puedes devolver los índices en cualquier orden.",
        "en": "Given an array of integers `nums` and an integer `target`, return the **indices** of the two numbers that add up to `target`.\n\nEach input has **exactly one solution**, and you may not use the same element twice. You can return the indices in any order.",
    },
    constraints=["2 <= nums.length <= 10^5", "-10^9 <= nums[i], target <= 10^9", "Existe exactamente una respuesta / exactly one answer exists"],
    signature={"functionName": "twoSum", "params": [{"name": "nums", "type": "int[]"}, {"name": "target", "type": "int"}], "returnType": "int[]"},
    compare="unordered",
    examples=[
        {"input": [[2, 7, 11, 15], 9], "explanation": {"es": "nums[0] + nums[1] = 2 + 7 = 9, así que devolvemos [0, 1].", "en": "nums[0] + nums[1] = 2 + 7 = 9, so we return [0, 1]."}},
        {"input": [[3, 2, 4], 6]},
        {"input": [[3, 3], 6]},
    ],
    tests=[{"input": t} for t in [
        [[1, 5], 6], [[-1, -2, -3, -4, -5], -8], [[0, 4, 3, 0], 0], [[1000000000, -999999993, 8], 7],
        [[5, 75, 25], 100], [list(range(1, 100001, 2)) + [100002], 99999 + 100002],
    ]],
    reference="""
class Solution:
    def twoSum(self, nums, target):
        seen = {}
        for i, x in enumerate(nums):
            if target - x in seen:
                return [seen[target - x], i]
            seen[x] = i
""",
)

problem(
    slug="producto-excepto-si-mismo",
    dayOffset=-1,
    level=2,
    title={"es": "Producto del array excepto sí mismo", "en": "Product of Array Except Self"},
    statement={
        "es": "Dado un array de enteros `nums`, devuelve un array `answer` tal que `answer[i]` sea el **producto de todos los elementos de `nums` excepto `nums[i]`**.\n\nCuidado: los productos pueden no caber en un entero de 32 bits, por eso el resultado es de tipo `long`.\n\n**Reto:** resuélvelo en `O(n)` y **sin usar la división**.",
        "en": "Given an integer array `nums`, return an array `answer` such that `answer[i]` is the **product of all elements of `nums` except `nums[i]`**.\n\nCareful: products may not fit in a 32-bit integer, which is why the result type is `long`.\n\n**Challenge:** solve it in `O(n)` **without using division**.",
    },
    constraints=["2 <= nums.length <= 20", "-5 <= nums[i] <= 5"],
    signature={"functionName": "productExceptSelf", "params": [{"name": "nums", "type": "int[]"}], "returnType": "long[]"},
    compare="exact",
    examples=[
        {"input": [[1, 2, 3, 4]]},
        {"input": [[-1, 1, 0, -3, 3]]},
    ],
    tests=[{"input": t} for t in [
        [[0, 0]], [[5, 5]], [[0, 4, 5]], [[-5] * 20], [[5] * 20], [[2, -3, 4, -5, 1, 1, 2]],
        [[random.randint(-5, 5) or 1 for _ in range(20)]], [[1, 0, 1, 0, 1]], [[3, -4]],
    ]],
    reference="""
class Solution:
    def productExceptSelf(self, nums):
        n = len(nums)
        out = [1] * n
        p = 1
        for i in range(n):
            out[i] = p
            p *= nums[i]
        p = 1
        for i in range(n - 1, -1, -1):
            out[i] *= p
            p *= nums[i]
        return out
""",
)

problem(
    slug="numero-de-islas",
    dayOffset=-1,
    level=3,
    title={"es": "Número de islas", "en": "Number of Islands"},
    statement={
        "es": "Recibes un mapa `grid` de `m` filas, donde cada fila es una cadena formada por `'1'` (tierra) y `'0'` (agua).\n\nDevuelve el **número de islas**. Una isla está rodeada de agua y se forma conectando tierras adyacentes en **horizontal o vertical**. Se asume que fuera del mapa todo es agua.",
        "en": "You are given a map `grid` with `m` rows, where each row is a string made of `'1'` (land) and `'0'` (water).\n\nReturn the **number of islands**. An island is surrounded by water and is formed by connecting adjacent lands **horizontally or vertically**. Assume everything outside the map is water.",
    },
    constraints=["1 <= m, n <= 300", "grid[i][j] es '0' o '1' / is '0' or '1'"],
    signature={"functionName": "numIslands", "params": [{"name": "grid", "type": "string[]"}], "returnType": "int"},
    compare="exact",
    examples=[
        {"input": [["11110", "11010", "11000", "00000"]]},
        {"input": [["11000", "11000", "00100", "00011"]]},
    ],
    tests=[{"input": t} for t in [
        [["0"]], [["1"]], [["10101"]], [["1", "0", "1"]], [["111", "101", "111"]], [["010", "101", "010"]],
        [["".join(random.choice("01") for _ in range(50)) for _ in range(50)]],
        [["".join("1" if random.random() < 0.45 else "0" for _ in range(300)) for _ in range(300)]],
        [["1" * 300 for _ in range(300)]],
    ]],
    reference="""
class Solution:
    def numIslands(self, grid):
        m, n = len(grid), len(grid[0])
        seen = [[False] * n for _ in range(m)]
        count = 0
        for i in range(m):
            for j in range(n):
                if grid[i][j] == '1' and not seen[i][j]:
                    count += 1
                    stack = [(i, j)]
                    seen[i][j] = True
                    while stack:
                        x, y = stack.pop()
                        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                            a, b = x + dx, y + dy
                            if 0 <= a < m and 0 <= b < n and grid[a][b] == '1' and not seen[a][b]:
                                seen[a][b] = True
                                stack.append((a, b))
        return count
""",
)


def rand_obstacle_grid(m, n, p):
    g = [[1 if random.random() < p else 0 for _ in range(n)] for _ in range(m)]
    g[0][0] = 0
    g[m - 1][n - 1] = 0
    return g


problem(
    slug="camino-con-eliminacion",
    dayOffset=-1,
    level=4,
    title={"es": "Camino más corto eliminando obstáculos", "en": "Shortest Path with Obstacle Elimination"},
    statement={
        "es": "Tienes una cuadrícula `grid` de `m x n` donde cada celda es `0` (libre) o `1` (obstáculo). En cada paso puedes moverte arriba, abajo, izquierda o derecha a una celda libre.\n\nDevuelve el **mínimo número de pasos** para ir desde la esquina superior izquierda `(0, 0)` a la inferior derecha `(m - 1, n - 1)`, sabiendo que puedes **eliminar como mucho `k` obstáculos**. Si no es posible, devuelve `-1`.",
        "en": "You are given an `m x n` grid where each cell is `0` (empty) or `1` (obstacle). In one step you can move up, down, left or right to an empty cell.\n\nReturn the **minimum number of steps** to walk from the top-left corner `(0, 0)` to the bottom-right corner `(m - 1, n - 1)`, given that you can **eliminate at most `k` obstacles**. If it is not possible, return `-1`.",
    },
    constraints=["1 <= m, n <= 40", "1 <= k <= m * n", "grid[0][0] == grid[m-1][n-1] == 0"],
    signature={"functionName": "shortestPath", "params": [{"name": "grid", "type": "int[][]"}, {"name": "k", "type": "int"}], "returnType": "int"},
    compare="exact",
    examples=[
        {"input": [[[0, 0, 0], [1, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 0]], 1], "explanation": {"es": "Sin eliminar nada harían falta 10 pasos. Eliminando el obstáculo de (3,2) bastan 6.", "en": "Without eliminating anything it takes 10 steps. Eliminating the obstacle at (3,2) takes only 6."}},
        {"input": [[[0, 1, 1], [1, 1, 1], [1, 0, 0]], 1]},
    ],
    tests=[{"input": t} for t in [
        [[[0]], 1], [[[0, 1], [1, 0]], 1], [[[0, 1, 0, 0, 0, 1, 0, 0], [0, 1, 0, 1, 0, 1, 0, 1], [0, 0, 0, 1, 0, 0, 1, 0]], 1],
        [rand_obstacle_grid(10, 10, 0.4), 2], [rand_obstacle_grid(20, 20, 0.5), 3], [rand_obstacle_grid(40, 40, 0.35), 5],
        [rand_obstacle_grid(40, 40, 0.6), 10], [rand_obstacle_grid(40, 40, 0.9), 1], [rand_obstacle_grid(40, 40, 0.3), 1600],
    ]],
    reference="""
from collections import deque
class Solution:
    def shortestPath(self, grid, k):
        m, n = len(grid), len(grid[0])
        best = [[-1] * n for _ in range(m)]
        q = deque([(0, 0, k, 0)])
        best[0][0] = k
        while q:
            x, y, r, d = q.popleft()
            if x == m - 1 and y == n - 1:
                return d
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                a, b = x + dx, y + dy
                if 0 <= a < m and 0 <= b < n:
                    nr = r - grid[a][b]
                    if nr > best[a][b]:
                        best[a][b] = nr
                        q.append((a, b, nr, d + 1))
        return -1
""",
)


problem(
    slug="fizzbuzz",
    dayOffset=0,
    level=1,
    title={"es": "FizzBuzz", "en": "FizzBuzz"},
    statement={
        "es": "Dado un entero `n`, devuelve un array de cadenas `answer` (indexado desde 1) donde:\n\n- `answer[i] == \"FizzBuzz\"` si `i` es divisible por 3 y por 5.\n- `answer[i] == \"Fizz\"` si `i` es divisible por 3.\n- `answer[i] == \"Buzz\"` si `i` es divisible por 5.\n- `answer[i] == i` (como cadena) en cualquier otro caso.",
        "en": "Given an integer `n`, return a string array `answer` (1-indexed) where:\n\n- `answer[i] == \"FizzBuzz\"` if `i` is divisible by 3 and 5.\n- `answer[i] == \"Fizz\"` if `i` is divisible by 3.\n- `answer[i] == \"Buzz\"` if `i` is divisible by 5.\n- `answer[i] == i` (as a string) otherwise.",
    },
    constraints=["1 <= n <= 10^4"],
    signature={"functionName": "fizzBuzz", "params": [{"name": "n", "type": "int"}], "returnType": "string[]"},
    compare="exact",
    examples=[{"input": [3]}, {"input": [5]}, {"input": [15]}],
    tests=[{"input": [n]} for n in [1, 2, 6, 10, 30, 99, 100, 1000, 10000]],
    reference="""
class Solution:
    def fizzBuzz(self, n):
        return ['FizzBuzz' if i % 15 == 0 else 'Fizz' if i % 3 == 0 else 'Buzz' if i % 5 == 0 else str(i) for i in range(1, n + 1)]
""",
)


def topk_case(distinct, k):
    values = random.sample(range(-10000, 10000), distinct)
    freqs = random.sample(range(1, distinct * 3), distinct)
    nums = [v for v, f in zip(values, freqs) for _ in range(f)]
    random.shuffle(nums)
    return [nums, k]


problem(
    slug="k-mas-frecuentes",
    dayOffset=0,
    level=2,
    title={"es": "Los K elementos más frecuentes", "en": "Top K Frequent Elements"},
    statement={
        "es": "Dado un array de enteros `nums` y un entero `k`, devuelve los `k` **elementos más frecuentes**. Puedes devolverlos en **cualquier orden**.\n\nSe garantiza que la respuesta es única.\n\n**Reto:** consigue una complejidad mejor que `O(n log n)`.",
        "en": "Given an integer array `nums` and an integer `k`, return the `k` **most frequent elements**. You may return them in **any order**.\n\nThe answer is guaranteed to be unique.\n\n**Challenge:** do better than `O(n log n)`.",
    },
    constraints=["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4", "1 <= k <= nº de elementos distintos / number of distinct elements"],
    signature={"functionName": "topKFrequent", "params": [{"name": "nums", "type": "int[]"}, {"name": "k", "type": "int"}], "returnType": "int[]"},
    compare="unordered",
    examples=[{"input": [[1, 1, 1, 2, 2, 3], 2]}, {"input": [[1], 1]}],
    tests=[{"input": t} for t in [
        [[4, 4, 4, 4, -1, -1, 7], 1], [[5, 5, 6, 6, 6, 7], 2], [[3, 0, 1, 0], 1], [[-3, -3, -2], 2],
        topk_case(10, 3), topk_case(50, 10), topk_case(200, 200), topk_case(250, 1),
    ]],
    reference="""
from collections import Counter
class Solution:
    def topKFrequent(self, nums, k):
        return [x for x, _ in Counter(nums).most_common(k)]
""",
)

problem(
    slug="rectangulo-histograma",
    dayOffset=0,
    level=3,
    title={"es": "Mayor rectángulo en un histograma", "en": "Largest Rectangle in Histogram"},
    statement={
        "es": "Dado un array de enteros `heights` que representa las alturas de las barras de un histograma, donde cada barra tiene **anchura 1**, devuelve el **área del mayor rectángulo** que cabe dentro del histograma.\n\nOjo: hay tests grandes, una solución `O(n²)` no pasará.",
        "en": "Given an array of integers `heights` representing the bar heights of a histogram where each bar has **width 1**, return the **area of the largest rectangle** that fits inside the histogram.\n\nHeads up: there are large tests, an `O(n²)` solution won't pass.",
    },
    constraints=["1 <= heights.length <= 10^5", "0 <= heights[i] <= 10^4"],
    signature={"functionName": "largestRectangleArea", "params": [{"name": "heights", "type": "int[]"}], "returnType": "int"},
    compare="exact",
    examples=[
        {"input": [[2, 1, 5, 6, 2, 3]], "explanation": {"es": "El mayor rectángulo usa las barras de altura 5 y 6: área = 5 × 2 = 10.", "en": "The largest rectangle spans the bars of height 5 and 6: area = 5 × 2 = 10."}},
        {"input": [[2, 4]]},
    ],
    tests=[{"input": [t]} for t in [
        [0], [7], [1, 1], [2, 1, 2], [6, 2, 5, 4, 5, 1, 6], [4, 2, 0, 3, 2, 5], list(range(1, 11)), list(range(10, 0, -1)),
        [random.randint(0, 10000) for _ in range(100000)], [min(i, 10000) for i in range(100000)], [10000] * 100000,
    ]],
    reference="""
class Solution:
    def largestRectangleArea(self, heights):
        stack = []
        best = 0
        for i, h in enumerate(heights + [0]):
            start = i
            while stack and stack[-1][1] >= h:
                idx, hh = stack.pop()
                best = max(best, hh * (i - idx))
                start = idx
            stack.append((start, h))
        return best
""",
)

problem(
    slug="mediana-ventana-deslizante",
    dayOffset=0,
    level=4,
    title={"es": "Mediana en ventana deslizante", "en": "Sliding Window Median"},
    statement={
        "es": "Dado un array de enteros `nums` y un entero `k`, hay una ventana de tamaño `k` que se desliza desde el extremo izquierdo del array hasta el derecho, avanzando una posición cada vez.\n\nDevuelve la **mediana de cada ventana**. Si `k` es par, la mediana es la media de los dos valores centrales.\n\nSe aceptan respuestas con un error de hasta `10^-6`.",
        "en": "Given an integer array `nums` and an integer `k`, there is a sliding window of size `k` moving from the very left of the array to the very right, one position at a time.\n\nReturn the **median of each window**. If `k` is even, the median is the mean of the two middle values.\n\nAnswers within `10^-6` of the actual value are accepted.",
    },
    constraints=["1 <= k <= nums.length <= 3 * 10^4", "-2^31 <= nums[i] <= 2^31 - 1"],
    signature={"functionName": "medianSlidingWindow", "params": [{"name": "nums", "type": "int[]"}, {"name": "k", "type": "int"}], "returnType": "double[]"},
    compare="exact",
    examples=[
        {"input": [[1, 3, -1, -3, 5, 3, 6, 7], 3], "explanation": {"es": "Ventanas: [1,3,-1]→1, [3,-1,-3]→-1, [-1,-3,5]→-1, [-3,5,3]→3, [5,3,6]→5, [3,6,7]→6.", "en": "Windows: [1,3,-1]→1, [3,-1,-3]→-1, [-1,-3,5]→-1, [-3,5,3]→3, [5,3,6]→5, [3,6,7]→6."}},
        {"input": [[1, 2, 3, 4, 2, 3, 1, 4, 2], 4]},
    ],
    tests=[{"input": t} for t in [
        [[5], 1], [[1, 2], 2], [[2147483647, 2147483647], 2], [[-2147483648, -2147483648, 2147483647], 2],
        [[1, 1, 1, 1], 2], [[random.randint(-100, 100) for _ in range(200)], 7],
        [[random.randint(-10**9, 10**9) for _ in range(30000)], 5000],
        [[random.randint(-10**9, 10**9) for _ in range(30000)], 2],
        [[random.randint(0, 10) for _ in range(30000)], 30000],
    ]],
    reference="""
import bisect
class Solution:
    def medianSlidingWindow(self, nums, k):
        w = sorted(nums[:k])
        out = []
        for i in range(k, len(nums) + 1):
            out.append(float(w[k // 2]) if k % 2 else (w[k // 2 - 1] + w[k // 2]) / 2)
            if i == len(nums):
                break
            w.pop(bisect.bisect_left(w, nums[i - k]))
            bisect.insort(w, nums[i])
        return out
""",
)


def main():
    for p in PROBLEMS:
        run_reference(p)
        p["referenceSolution"] = {"language": "python", "code": "from typing import List\n" + p.pop("reference").strip("\n") + "\n"}
        p["timeLimit"] = 5
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "problems.json"), "w", encoding="utf-8") as f:
        json.dump(PROBLEMS, f, ensure_ascii=False, separators=(",", ":"))
    print(f"OK: {len(PROBLEMS)} problemas escritos en problems.json")


if __name__ == "__main__":
    main()
