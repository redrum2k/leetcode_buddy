export interface PlanData {
  name: string;
  slugs: readonly string[];
}

export const PLAN_PROBLEMS: Record<string, PlanData> = {
  'leetcode-75': {
    name: 'LeetCode 75',
    slugs: [
      // Array / String
      'merge-strings-alternately',
      'greatest-common-divisor-of-strings',
      'kids-with-the-greatest-number-of-candies',
      'can-place-flowers',
      'reverse-vowels-of-a-string',
      'reverse-words-in-a-string',
      'product-of-array-except-self',
      'increasing-triplet-subsequence',
      'string-compression',
      // Two Pointers
      'move-zeroes',
      'is-subsequence',
      'container-with-most-water',
      'max-number-of-k-sum-pairs',
      // Sliding Window
      'maximum-average-subarray-i',
      'maximum-number-of-vowels-in-a-substring-of-given-length',
      'max-consecutive-ones-iii',
      'longest-subarray-of-1s-after-deleting-one-element',
      // Prefix Sum
      'find-the-highest-altitude',
      'find-pivot-index',
      // Hash Map / Set
      'find-the-difference-of-two-arrays',
      'unique-number-of-occurrences',
      'determine-if-two-strings-are-close',
      'equal-row-and-column-pairs',
      // Stack
      'removing-stars-from-a-string',
      'asteroid-collision',
      'decode-string',
      // Queue
      'number-of-recent-calls',
      'dota2-senate',
      // Linked List
      'delete-the-middle-node-of-a-linked-list',
      'odd-even-linked-list',
      'reverse-linked-list',
      'maximum-twin-sum-of-a-linked-list',
      // Binary Tree - DFS
      'maximum-depth-of-binary-tree',
      'leaf-similar-trees',
      'count-good-nodes-in-binary-tree',
      'path-sum-iii',
      'longest-zigzag-path-in-a-binary-tree',
      'lowest-common-ancestor-of-a-binary-tree',
      // Binary Tree - BFS
      'binary-tree-right-side-view',
      'maximum-level-sum-of-a-binary-tree',
      // Binary Search Tree
      'search-in-a-binary-search-tree',
      'delete-node-in-a-bst',
      // Graphs - DFS
      'keys-and-rooms',
      'number-of-provinces',
      'reorder-routes-to-make-all-paths-lead-to-the-city-zero',
      'evaluate-division',
      // Graphs - BFS
      'nearest-exit-from-entrance-in-maze',
      'rotting-oranges',
      // Heap / Priority Queue
      'kth-largest-element-in-an-array',
      'smallest-number-in-infinite-set',
      'maximum-subsequence-score',
      'total-cost-to-hire-k-workers',
      // Binary Search
      'guess-number-higher-or-lower',
      'successful-pairs-of-spells-and-potions',
      'find-peak-element',
      'koko-eating-bananas',
      // Backtracking
      'letter-combinations-of-a-phone-number',
      'combination-sum-iii',
      // DP - 1D
      'n-th-tribonacci-number',
      'min-cost-climbing-stairs',
      'house-robber',
      'domino-and-tromino-tiling',
      // DP - Multidimensional
      'unique-paths',
      'longest-common-subsequence',
      'best-time-to-buy-and-sell-stock-with-transaction-fee',
      'edit-distance',
      // Bit Manipulation
      'counting-bits',
      'single-number',
      'minimum-flips-to-make-a-or-b-equal-to-c',
      // Trie
      'implement-trie-prefix-tree',
      'search-suggestions-system',
      // Intervals
      'non-overlapping-intervals',
      'minimum-number-of-arrows-to-burst-balloons',
      // Monotonic Stack
      'daily-temperatures',
      'online-stock-span',
    ],
  },

  'top-interview-150': {
    name: 'Top Interview 150',
    slugs: [
      // Array / String
      'merge-sorted-array',
      'remove-element',
      'remove-duplicates-from-sorted-array',
      'remove-duplicates-from-sorted-array-ii',
      'majority-element',
      'rotate-array',
      'best-time-to-buy-and-sell-stock',
      'best-time-to-buy-and-sell-stock-ii',
      'jump-game',
      'jump-game-ii',
      'h-index',
      'insert-delete-getrandom-o1',
      'product-of-array-except-self',
      'gas-station',
      'candy',
      'trapping-rain-water',
      'roman-to-integer',
      'integer-to-roman',
      'length-of-last-word',
      'longest-common-prefix',
      'reverse-words-in-a-string',
      'zigzag-conversion',
      'find-the-index-of-the-first-occurrence-in-a-string',
      'text-justification',
      // Two Pointers
      'valid-palindrome',
      'is-subsequence',
      'two-sum-ii-input-array-is-sorted',
      'container-with-most-water',
      '3sum',
      // Sliding Window
      'minimum-size-subarray-sum',
      'longest-substring-without-repeating-characters',
      'substring-with-concatenation-of-all-words',
      'minimum-window-substring',
      // Matrix
      'valid-sudoku',
      'spiral-matrix',
      'rotate-image',
      'set-matrix-zeroes',
      'game-of-life',
      // Hashmap
      'ransom-note',
      'isomorphic-strings',
      'word-pattern',
      'valid-anagram',
      'group-anagrams',
      'two-sum',
      'happy-number',
      'contains-duplicate-ii',
      'longest-consecutive-sequence',
      // Intervals
      'summary-ranges',
      'merge-intervals',
      'insert-interval',
      'minimum-number-of-arrows-to-burst-balloons',
      // Stack
      'valid-parentheses',
      'simplify-path',
      'min-stack',
      'evaluate-reverse-polish-notation',
      'basic-calculator',
      // Linked List
      'linked-list-cycle',
      'add-two-numbers',
      'merge-two-sorted-lists',
      'copy-list-with-random-pointer',
      'reverse-linked-list-ii',
      'reverse-nodes-in-k-group',
      'remove-nth-node-from-end-of-list',
      'remove-duplicates-from-sorted-list-ii',
      'lru-cache',
      'sort-list',
      'merge-k-sorted-lists',
      // Binary Tree - General
      'maximum-depth-of-binary-tree',
      'same-tree',
      'invert-binary-tree',
      'symmetric-tree',
      'construct-binary-tree-from-preorder-and-inorder-traversal',
      'construct-binary-tree-from-inorder-and-postorder-traversal',
      'populate-next-right-pointers-in-each-node-ii',
      'flatten-binary-tree-to-linked-list',
      'path-sum',
      'sum-root-to-leaf-numbers',
      'binary-tree-maximum-path-sum',
      'count-complete-tree-nodes',
      // Binary Tree - BFS
      'binary-tree-right-side-view',
      'average-of-levels-in-binary-tree',
      'binary-tree-level-order-traversal',
      'binary-tree-zigzag-level-order-traversal',
      // Binary Search Tree
      'minimum-absolute-difference-in-bst',
      'kth-smallest-element-in-a-bst',
      'validate-binary-search-tree',
      // Graph - General
      'number-of-islands',
      'surrounded-regions',
      'clone-graph',
      'evaluate-division',
      'course-schedule',
      'course-schedule-ii',
      // Graph - BFS
      'snakes-and-ladders',
      'minimum-genetic-mutation',
      'word-ladder',
      // Trie
      'implement-trie-prefix-tree',
      'design-add-and-search-words-data-structure',
      'word-search-ii',
      // Backtracking
      'letter-combinations-of-a-phone-number',
      'combinations',
      'permutations',
      'combination-sum',
      'n-queens-ii',
      'generate-parentheses',
      'word-search',
      // Divide & Conquer
      'convert-sorted-array-to-binary-search-tree',
      'sort-list',
      'construct-quad-tree',
      'merge-k-sorted-lists',
      // Kadane's Algorithm
      'maximum-subarray',
      'maximum-sum-circular-subarray',
      // Binary Search
      'search-insert-position',
      'search-a-2d-matrix',
      'find-peak-element',
      'search-in-rotated-sorted-array',
      'find-first-and-last-position-of-element-in-sorted-array',
      'find-minimum-in-rotated-sorted-array',
      'median-of-two-sorted-arrays',
      // Heap / Priority Queue
      'kth-largest-element-in-an-array',
      'ipo',
      'find-k-pairs-with-smallest-sums',
      'find-median-from-data-stream',
      // Bit Manipulation
      'add-binary',
      'reverse-bits',
      'number-of-1-bits',
      'single-number',
      'single-number-ii',
      'bitwise-and-of-numbers-range',
      // Math
      'palindrome-number',
      'plus-one',
      'factorial-trailing-zeroes',
      'sqrtx',
      'powx-n',
      'max-points-on-a-line',
      // 1D DP
      'climbing-stairs',
      'house-robber',
      'word-break',
      'coin-change',
      'longest-increasing-subsequence',
      // Multidimensional DP
      'triangle',
      'minimum-path-sum',
      'unique-paths-ii',
      'longest-palindromic-substring',
      'interleaving-string',
      'edit-distance',
      'best-time-to-buy-and-sell-stock-iii',
      'best-time-to-buy-and-sell-stock-iv',
      'maximal-square',
    ],
  },
};
