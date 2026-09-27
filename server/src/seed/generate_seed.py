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
    editorial={
        "es": """**Idea:** dos punteros, uno al principio y otro al final, que se acercan saltándose lo que no sea letra o dígito.

1. Avanza `i` mientras `s[i]` no sea alfanumérico; retrocede `j` igual.
2. Compara `s[i]` y `s[j]` en minúsculas: si son distintos, no es palíndromo.
3. Si los punteros se cruzan sin encontrar diferencias, sí lo es.

También vale filtrar la cadena, pasarla a minúsculas y compararla con su inversa, pero así usa memoria extra.

**Complejidad:** tiempo `O(n)`, memoria `O(1)`.""",
        "en": """**Idea:** two pointers, one at the start and one at the end, moving inwards and skipping anything that is not a letter or digit.

1. Move `i` forward while `s[i]` is not alphanumeric; move `j` back the same way.
2. Compare `s[i]` and `s[j]` in lowercase: if they differ, it is not a palindrome.
3. If the pointers cross without a mismatch, it is one.

Filtering the string, lowercasing it and comparing it with its reverse also works, but uses extra memory.

**Complexity:** time `O(n)`, memory `O(1)`.""",
    },
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
    editorial={
        "es": """**Idea:** dos palabras son anagramas si tienen las mismas letras, así que comparten una **clave canónica**: la palabra con sus letras ordenadas (`"eat"`, `"tea"` → `"aet"`).

1. Recorre las palabras y calcula la clave de cada una.
2. Guárdala en un diccionario `clave → lista de palabras`.
3. Devuelve los valores del diccionario.

Si las palabras son largas, una clave más rápida es el recuento de las 26 letras.

**Complejidad:** tiempo `O(n · L log L)` (`L` = longitud de palabra), memoria `O(n · L)`.""",
        "en": """**Idea:** two words are anagrams when they have the same letters, so they share a **canonical key**: the word with its letters sorted (`"eat"`, `"tea"` → `"aet"`).

1. Go through the words and compute each key.
2. Store it in a map `key → list of words`.
3. Return the map's values.

For long words, a faster key is the count of the 26 letters.

**Complexity:** time `O(n · L log L)` (`L` = word length), memory `O(n · L)`.""",
    },
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
    editorial={
        "es": """**Idea:** programación dinámica sobre la cantidad. `dp[a]` = mínimo de monedas para sumar `a`.

1. `dp[0] = 0` y el resto empieza en infinito.
2. Para cada `a` de 1 a `amount` y cada moneda `c ≤ a`: `dp[a] = min(dp[a], dp[a - c] + 1)`.
3. Si `dp[amount]` sigue en infinito, devuelve `-1`.

Ojo: la estrategia voraz (coger siempre la moneda más grande) falla con monedas como `[1, 3, 4]` y cantidad `6`: da 3 monedas (4+1+1) cuando basta con 2 (3+3).

**Complejidad:** tiempo `O(amount · monedas)`, memoria `O(amount)`.""",
        "en": """**Idea:** dynamic programming over the amount. `dp[a]` = fewest coins that add up to `a`.

1. `dp[0] = 0` and everything else starts at infinity.
2. For each `a` from 1 to `amount` and each coin `c ≤ a`: `dp[a] = min(dp[a], dp[a - c] + 1)`.
3. If `dp[amount]` is still infinity, return `-1`.

Careful: the greedy approach (always take the biggest coin) fails with coins like `[1, 3, 4]` and amount `6`: it uses 3 coins (4+1+1) when 2 are enough (3+3).

**Complexity:** time `O(amount · coins)`, memory `O(amount)`.""",
    },
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
    constraints=["0 <= m, n <= 5 * 10^4", "1 <= m + n", "-10^6 <= a[i], b[i] <= 10^6"],
    signature={"functionName": "findMedianSortedArrays", "params": [{"name": "a", "type": "int[]"}, {"name": "b", "type": "int[]"}], "returnType": "double"},
    compare="exact",
    examples=[
        {"input": [[1, 3], [2]], "explanation": {"es": "Unión = [1,2,3], mediana = 2.", "en": "Merged = [1,2,3], median = 2."}},
        {"input": [[1, 2], [3, 4]], "explanation": {"es": "Unión = [1,2,3,4], mediana = (2 + 3) / 2 = 2.5.", "en": "Merged = [1,2,3,4], median = (2 + 3) / 2 = 2.5."}},
    ],
    tests=[{"input": t} for t in [
        [[], [1]], [[2], []], [[0, 0], [0, 0]], [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]],
        [[-5, -3, -1], [-2]], [[1], [2, 3, 4, 5, 6]], [[1000000], [-1000000]],
        [sorted(random.randint(-10**6, 10**6) for _ in range(44999)), sorted(random.randint(-10**6, 10**6) for _ in range(45000))],
        [sorted(random.randint(-100, 100) for _ in range(50000)), []],
    ]],
    editorial={
        "es": """**Idea sencilla (`O(m + n)`):** mezcla los dos arrays como en *merge sort* hasta llegar a la mitad, y la mediana es el elemento central (o la media de los dos centrales).

**Idea para el reto (`O(log(min(m, n)))`):** busca por bisección cuántos elementos `i` tomar del array más corto para la mitad izquierda; del otro se toman `j = (m + n + 1) / 2 - i`. El corte es correcto cuando `a[i-1] ≤ b[j]` y `b[j-1] ≤ a[i]`. Si `a[i-1] > b[j]`, mueve el corte a la izquierda; si no, a la derecha. La mediana sale del máximo de la izquierda y el mínimo de la derecha.

La solución oficial en Python simplemente une y ordena los dos arrays, que basta para estos tests.

**Complejidad:** `O(m + n)` o `O(log(min(m, n)))` con la bisección.""",
        "en": """**Simple idea (`O(m + n)`):** merge both arrays as in *merge sort* until you reach the middle; the median is the middle element (or the mean of the two middle ones).

**Idea for the challenge (`O(log(min(m, n)))`):** binary-search how many elements `i` to take from the shorter array into the left half; the other array contributes `j = (m + n + 1) / 2 - i`. The cut is right when `a[i-1] ≤ b[j]` and `b[j-1] ≤ a[i]`. If `a[i-1] > b[j]`, move the cut left; otherwise move it right. The median comes from the max of the left side and the min of the right side.

The official Python solution simply joins and sorts both arrays, which is enough for these tests.

**Complexity:** `O(m + n)`, or `O(log(min(m, n)))` with the binary search.""",
    },
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
    editorial={
        "es": """**Idea:** para cada número `x` necesitas saber si ya has visto su complemento `target - x`. Un diccionario `valor → índice` lo dice en `O(1)`.

1. Recorre el array.
2. Si `target - x` está en el diccionario, devuelve su índice y el actual.
3. Si no, guarda `x` con su índice y sigue.

Buscar el complemento **antes** de guardar `x` evita usar el mismo elemento dos veces.

**Complejidad:** tiempo `O(n)`, memoria `O(n)`.""",
        "en": """**Idea:** for each number `x` you need to know whether you have already seen its complement `target - x`. A map `value → index` answers that in `O(1)`.

1. Walk through the array.
2. If `target - x` is in the map, return its index and the current one.
3. Otherwise store `x` with its index and keep going.

Looking up the complement **before** storing `x` avoids using the same element twice.

**Complexity:** time `O(n)`, memory `O(n)`.""",
    },
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
    editorial={
        "es": """**Idea:** el resultado en `i` es (producto de todo lo que hay a su izquierda) × (producto de todo lo que hay a su derecha). Se calcula sin dividir, así que los ceros no son un problema.

1. Primera pasada de izquierda a derecha: `res[i]` = producto de `nums[0..i-1]`.
2. Segunda pasada de derecha a izquierda, con un acumulado `p` del sufijo: `res[i] *= p` y después `p *= nums[i]`.

Usa enteros de 64 bits (`long`): los productos no caben en 32.

**Complejidad:** tiempo `O(n)`, memoria `O(1)` además de la respuesta.""",
        "en": """**Idea:** the answer at `i` is (product of everything to its left) × (product of everything to its right). No division is needed, so zeros are not a problem.

1. First pass left to right: `res[i]` = product of `nums[0..i-1]`.
2. Second pass right to left with a running suffix product `p`: `res[i] *= p`, then `p *= nums[i]`.

Use 64-bit integers (`long`): the products do not fit in 32 bits.

**Complexity:** time `O(n)`, memory `O(1)` besides the answer.""",
    },
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
    editorial={
        "es": """**Idea:** cada vez que encuentras una tierra sin visitar has descubierto una isla nueva; recórrela entera para no contarla otra vez.

1. Recorre todas las celdas.
2. Si es `'1'` y no está visitada, suma 1 y lanza un BFS (o DFS) desde ella que marque como visitadas todas las tierras conectadas en horizontal y vertical.
3. Al terminar, el contador es el número de islas.

En mapas grandes, mejor BFS con una cola o DFS iterativo: un DFS recursivo puede desbordar la pila.

**Complejidad:** tiempo `O(m · n)`, memoria `O(m · n)` para las visitadas.""",
        "en": """**Idea:** every time you find unvisited land you have found a new island; flood it completely so it is not counted again.

1. Go through every cell.
2. If it is `'1'` and not visited, add 1 and run a BFS (or DFS) from it that marks all horizontally and vertically connected land as visited.
3. At the end, the counter is the number of islands.

On large maps prefer BFS with a queue or an iterative DFS: a recursive DFS can overflow the stack.

**Complexity:** time `O(m · n)`, memory `O(m · n)` for the visited cells.""",
    },
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
    editorial={
        "es": """**Idea:** BFS donde el estado no es solo la celda, sino `(fila, columna, eliminaciones que quedan)`. El BFS encuentra el camino más corto porque todos los pasos cuestan 1.

1. Empieza en `(0, 0)` con `k` eliminaciones.
2. Al moverte a una celda con obstáculo gastas una; si no te quedan, no puedes pasar.
3. Poda clave: guarda para cada celda el **máximo** de eliminaciones restantes con que has llegado. Si vuelves con las mismas o menos, ese camino no puede ser mejor: descártalo.
4. La primera vez que sacas de la cola la esquina final, esa distancia es la respuesta.

Truco extra: si `k ≥ m + n - 2`, puedes ir en línea recta y la respuesta es `m + n - 2`.

**Complejidad:** tiempo y memoria `O(m · n · k)` en el peor caso.""",
        "en": """**Idea:** BFS where the state is not just the cell but `(row, column, removals left)`. BFS finds the shortest path because every step costs 1.

1. Start at `(0, 0)` with `k` removals.
2. Moving onto an obstacle uses one; if none are left, you cannot pass.
3. Key pruning: for each cell store the **most** removals left you have arrived with. If you come back with the same or fewer, that path cannot be better: drop it.
4. The first time you pop the bottom-right corner, its distance is the answer.

Extra trick: if `k ≥ m + n - 2`, you can walk straight and the answer is `m + n - 2`.

**Complexity:** time and memory `O(m · n · k)` in the worst case.""",
    },
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
    editorial={
        "es": """**Idea:** recorre los números de `1` a `n` y decide qué texto toca a cada uno.

1. Si `i` es múltiplo de 15 (de 3 **y** de 5), añade `"FizzBuzz"`. Esta comprobación va primero: si miras antes el 3, nunca llegarías a ella.
2. Si no, si es múltiplo de 3, `"Fizz"`; si es múltiplo de 5, `"Buzz"`.
3. En otro caso, el propio número como texto.

**Complejidad:** tiempo `O(n)`, memoria `O(n)` para la respuesta.""",
        "en": """**Idea:** walk through the numbers `1` to `n` and pick the right text for each one.

1. If `i` is a multiple of 15 (of 3 **and** 5), append `"FizzBuzz"`. This check goes first: if you test 3 before it, you never reach it.
2. Otherwise, a multiple of 3 gives `"Fizz"` and a multiple of 5 gives `"Buzz"`.
3. Anything else is the number itself as text.

**Complexity:** time `O(n)`, memory `O(n)` for the answer.""",
    },
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
    editorial={
        "es": """**Idea:** cuenta las apariciones y quédate con las `k` mayores sin ordenarlo todo.

1. Cuenta con un diccionario `número → frecuencia`.
2. *Bucket sort*: crea `n + 1` cubos donde el cubo `f` guarda los números que aparecen `f` veces.
3. Recorre los cubos de mayor a menor frecuencia y ve tomando números hasta tener `k`.

Alternativa: un montículo (heap) de tamaño `k`, en `O(n log k)`.

**Complejidad:** tiempo `O(n)`, memoria `O(n)`.""",
        "en": """**Idea:** count occurrences and keep the `k` largest without sorting everything.

1. Count with a map `number → frequency`.
2. *Bucket sort*: create `n + 1` buckets where bucket `f` holds the numbers that appear `f` times.
3. Walk the buckets from highest to lowest frequency, taking numbers until you have `k`.

Alternative: a heap of size `k`, in `O(n log k)`.

**Complexity:** time `O(n)`, memory `O(n)`.""",
    },
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
    editorial={
        "es": """**Idea:** para cada barra, el mayor rectángulo con su altura se extiende hasta la primera barra más baja a cada lado. Una **pila monótona** (alturas crecientes) encuentra esos límites en una sola pasada.

1. Recorre las barras (añade una de altura 0 al final para vaciar la pila).
2. Mientras la barra actual sea más baja que la de la cima, saca la cima: su altura `h` ya no puede extenderse más a la derecha. Su anchura va desde el elemento que queda debajo en la pila (+1) hasta la posición actual (-1). Actualiza el máximo con `h × anchura`.
3. Mete el índice actual en la pila.

**Complejidad:** tiempo `O(n)` (cada índice entra y sale una vez), memoria `O(n)`.""",
        "en": """**Idea:** for each bar, the largest rectangle with its height extends to the first lower bar on each side. A **monotonic stack** (increasing heights) finds those limits in a single pass.

1. Walk through the bars (append a bar of height 0 at the end to flush the stack).
2. While the current bar is lower than the one on top, pop the top: its height `h` cannot extend further right. Its width goes from the element left below it on the stack (+1) to the current position (-1). Update the maximum with `h × width`.
3. Push the current index.

**Complexity:** time `O(n)` (each index is pushed and popped once), memory `O(n)`.""",
    },
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
        [[random.randint(-10**9, 10**9) for _ in range(30000)], 24000],
        [[random.randint(-1000, 1000) for _ in range(12000)], 2],
        [[random.randint(0, 10) for _ in range(30000)], 30000],
    ]],
    editorial={
        "es": """**Idea:** mantén los `k` elementos de la ventana **ordenados**, así la mediana está siempre en el centro.

1. Llena la ventana con los primeros `k` números, ordenada.
2. Por cada paso: la mediana es `w[k/2]` si `k` es impar, o la media de `w[k/2 - 1]` y `w[k/2]` si es par.
3. Para avanzar, borra el número que sale (búsqueda binaria) e inserta el que entra en su sitio (búsqueda binaria).

En Python, con `bisect` sobre una lista, cada paso es `O(k)` por desplazar elementos, pero muy rápido en la práctica. La versión `O(n log k)` usa dos montículos (mitad baja y mitad alta) con borrado perezoso.

**Complejidad:** `O(n · k)` con lista ordenada, `O(n log k)` con dos montículos.""",
        "en": """**Idea:** keep the window's `k` elements **sorted**, so the median is always in the middle.

1. Fill the window with the first `k` numbers, sorted.
2. At each step, the median is `w[k/2]` for odd `k`, or the mean of `w[k/2 - 1]` and `w[k/2]` for even `k`.
3. To slide, remove the outgoing number (binary search) and insert the incoming one in place (binary search).

In Python, `bisect` on a list makes each step `O(k)` because elements shift, but it is very fast in practice. The `O(n log k)` version uses two heaps (low half and high half) with lazy deletion.

**Complexity:** `O(n · k)` with a sorted list, `O(n log k)` with two heaps.""",
    },
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
