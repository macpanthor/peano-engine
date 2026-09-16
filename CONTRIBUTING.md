# contributing

there's one rule and it's not negotiable: **no arithmetic operators.**

that means no `+`, `-`, `*`, `/`, `++`, `--`, `+=` or `-=` in `assets/script.js`.
not in the logic, not in a helper, not "just this once". the whole project is
pointless if that rule bends.

before you open a PR:

```bash
node -e "const s=require('fs').readFileSync('assets/script.js','utf8');console.log(s.split('\n').filter(l=>{const c=l.split('//')[0];return c.trim()&&/[+*]|\+\+|--|\+=|-=|\//.test(c)}).length)"
```

that has to print `0`. if it prints anything else, the PR gets closed and i
will be sad about it.

comments are fine. talk about operators all you want in prose.

---

## things i'd actually love

### port it to another language

this is the most useful thing anyone could do, and it's a self-contained
evening project. the trick travels — any language with a growable array works:

| language | counter |
|---|---|
| python | `list` |
| ruby | `Array` |
| php | arrays |
| rust | `Vec` |
| go | slices |
| c# | `List<T>` |
| java | `ArrayList` |

put it in `ports/<language>/` and keep the same rules. a python port would be
genuinely great. so would a rust one where the borrow checker fights you the
whole way.

### add multiplication

multiplication is repeated addition and you already have the successor table.
so `a * b` is... a walk of walks. i've thought about it. it's horrifying.
someone should do it.

```js
// sketch, not real code
result = 0
repeat b times:
  repeat a times:
    result = NEXT[result]
```

be careful with the domain. `300 * 400` is 120000 lookups which is fine, but
`1000 * 1000` at 200 lookups per frame means you're waiting eight minutes.
you may want a bigger PER_FRAME for the inner loop, or just accept it.

### add more planted bugs

there's exactly one right now (`NEXT[41] = 43`). a second one in `PREV` would be
evil. do it. add a comment in the html hinting at it.

other ideas:
- make the existing bug toggleable with `?bug=off` so screenshots look right
- a bug that only triggers above 50000
- a bug that's correct but makes the progress bar lie

### other stuff

- **keyboard shortcuts.** enter already works. maybe `+` and `-` keys to switch op.
- **a "show your work" view.** dump every hop into the log so you can watch it
  climb. would be slow and great.
- **bigger domain.** 100000 is arbitrary. it's just a tradeoff between load time
  and how long the progress bar stays funny.
- **save the tables to localStorage** so the second load is instant. feels like
  cheating somehow but it's fair.

---

## what i'll probably say no to

- **a build step.** it's three files. it should stay three files.
- **frameworks.** no react. no tailwind. no bundler. that's the point.
- **npm / a package.** it's a webpage, not a library.
- **making it fast.** the slowness is the demo. optimizing it removes the joke.
- **a dark/light toggle.** just respect `prefers-color-scheme` if you touch it.

---

## how to send a change

1. fork
2. branch (`git checkout -b add-multiplication`)
3. run the zero-operator check above
4. PR, with a line about which section above you're doing

small PRs get merged fastest. if you want to do something big like a full rust
port, open an issue first so we don't both write it.

---

## one more thing

if you find the bug and it's just the one in the readme, that's not a discovery.
if you find a *second* bug that i didn't plant, that's very interesting and you
should definitely open an issue.
