# a calculator that refuses to do math

it adds. it subtracts. it uses **zero** arithmetic operators to do it.

no `+`, no `-`, no `*`, no `/`, no `++`, no `--`, no `+=`, no `-=`. anywhere in
the js. and it still gets the right answers, which is the whole point.

it's actual peano arithmetic too, not a trick where i hid the `+` somewhere.
addition really is "count up one at a time", so that's what it does.

**demo:** https://macpanthor.github.io/peano-engine/ · built by [macpanthor](https://macpanthor.com/)

MIT licensed. fork it, steal it, do whatever.

---

## steal this trick

the array-as-counter thing isn't specific to calculators. any time you need to
count without a `+` — code golf, interview puzzles, teaching recursion, weird
contest rules, "no arithmetic operators" homework — this works:

```js
var n = [];          // n.length is your number
n.push(null);        // n.length just went up by 1
n.pop();             // n.length just went down by 1
```

that's it. that's the whole trick. `.length` is data, `push`/`pop` are your
increment and decrement, and you never type an operator.

once you have that, the successor table falls out of it, and addition is just a
loop. same idea works in any language with growable arrays — python `list`,
ruby `Array`, php arrays, even a `Vec` in rust.

fork it and use it in something dumber than a calculator. i'd genuinely like
to see that.

---

## how it works

this is the same trick, just applied to a whole calculator.

count an array up to 100000 and write down every step, and you've got a
successor table. do it backwards by popping and you've got a predecessor table.

```js
NEXT[0]     = 1
NEXT[1]     = 2
NEXT[99999] = 100000
```

after that `a + b` is just "start at a, ask NEXT for directions b times":

```
result = a
repeat b times:
  result = NEXT[result]
```

subtraction is the exact same loop through `PREV`.

so yeah. two 100000-entry tables and a loop. that's the calculator.

---

## why is it so slow

because it's actually doing the work. `50000 + 50000` is 50000 separate lookups
and takes about two seconds. the progress bar isn't fake — it's counting.

it does 200 lookups per animation frame. tuned that number by vibe. small sums
are instant, big ones are funny.

---

## there's a bug. on purpose.

one number in the successor table is wrong:

```js
NEXT[41] = 43;
```

it only does anything if a walk *lands on 41 and then tries to leave*. so
`0 + 41` is fine but `0 + 42` gives you `43`. cross that point and everything
after it is 1 too high.

been there since v1.0. not fixing it.

there's a `<!-- can you find the bug? -->` at the top of the html if anyone
goes looking.

---

## stuff it does

| | |
|---|---|
| numbers | 0 to 100000 |
| too big | says OVERFLOW and gives up |
| too small | stops at 0, doesn't do negatives |
| bad input | rejects it |
| out of range | clamps it back into 0-100000 |

---

## files

```
index.html              the page
assets/
  styles.css            all the styling
  script.js             the engine (zero arithmetic operators)
  logo.webp, logo.png
  favicon.ico, favicon-16x16.png, favicon-32x32.png
  apple-touch-icon.png
  android-chrome-192x192.png, android-chrome-512x512.png
```

three real files. no build step, no npm, no dependencies. not even a webfont.
just open `index.html`.

---

## running it

```bash
git clone https://github.com/macpanthor/peano-engine.git
cd peano-engine
```

open `index.html`. done.

or if you'd rather serve it:

```bash
python -m http.server 8000
```

---

## prove it

the whole thing is a lie if there's a `+` hiding in there, so don't take my word
for it.

**node** — strips comments then counts operator matches:

```bash
node -e "const s=require('fs').readFileSync('assets/script.js','utf8');console.log(s.split('\n').filter(l=>{const c=l.split('//')[0];return c.trim()&&/[+*]|\+\+|--|\+=|-=|\//.test(c)}).length)"
```

gives you `0`.

**powershell** (windows):

```powershell
Get-Content assets\script.js |
  ForEach-Object { $_.Split('//')[0] } |
  Select-String -Pattern '[+*]|\+\+|--|\+=|-=|/'
```

prints nothing.

**bash / mac / linux**:

```bash
sed 's|//.*||' assets/script.js | grep -nE '[+*]|\+\+|--|\+=|-=|/'
```

also prints nothing.

heads up: plain old `grep '[+*]' assets/script.js` **will** match a bunch of
lines. that's fine. my comments talk about operators constantly. the claim is
about the *code*, not the comments.

---

## notes if you read the source

- counters are array lengths everywhere. that's why it's `ticks.push(null)`
  then `count = ticks.length` instead of `count++`.
- progress % is precomputed, not divided. at the start of a run it deals the hop
  budget into 100 buckets and then just counts full buckets. first version
  divided every frame and made a 100k run take 60 seconds instead of 3.
- tables get built on page load, not fetched. 100k successors plus 100k
  predecessors.
- `PREV[0]` is undefined on purpose. nothing comes before nothing.

---

## accessibility stuff

did try to do this properly:

- tabs are real tabs (`role="tablist"` / `tab` / `tabpanel`) with arrow keys
- the +/- thing is a `radiogroup` with `aria-checked`
- the answer area is `aria-live` so it gets announced
- focus rings everywhere, progress bar is a `role="progressbar"`
- respects `prefers-reduced-motion` and `forced-colors`

---

## license

MIT — do whatever you like with it.

---

<sub>written at an unreasonable hour. be nice to it.</sub>
