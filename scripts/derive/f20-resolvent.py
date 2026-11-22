"""
The sextic resolvent of the Frobenius group F20 for a depressed quintic
x^5 + p x^3 + q x^2 + r x + s, used in src/poly/galois.ts.

theta = sum over rotations of x1^2 (x2 x5 + x3 x4) has stabiliser F20 in S5
(checked below). Its 6 conjugates are the roots of a monic sextic whose
coefficient of y^(6-k) is a polynomial in p, q, r, s of weighted degree 4k
(weights 2, 3, 4, 5). The coefficients of those polynomials are found
exactly by solving a linear system over Q, with the resolvent of each
sample quintic computed from its roots at 80 digits and rounded; the
result is checked on 30 further quintics with larger coefficients.

Run: python3 scripts/derive/f20-resolvent.py   (needs sympy, mpmath)
"""
import itertools, random
from mpmath import mp, mpf, polyroots, nint, mpc
from sympy import Matrix, Rational, symbols, expand, Poly, factor, nsimplify
mp.dps = 80

def theta(x):
    x1,x2,x3,x4,x5 = x
    return (x1**2*(x2*x5+x3*x4) + x2**2*(x1*x3+x4*x5) + x3**2*(x1*x5+x2*x4)
            + x4**2*(x1*x2+x3*x5) + x5**2*(x1*x4+x2*x3))

# stabiliser of theta in S5
random.seed(1)
g = [mpf(random.random()) for _ in range(5)]
vals = {}
for perm in itertools.permutations(range(5)):
    v = theta([g[i] for i in perm])
    vals.setdefault(nint(v*10**30), []).append(perm)
print("distinct values:", len(vals), "stabiliser orders:", sorted(len(v) for v in vals.values()))
# coset representatives
reps = [v[0] for v in vals.values()]
stab = [p for p in vals[nint(theta(g)*10**30)]]
print("stabiliser of identity coset:", len(stab))

def resolvent(p, q, r, s):
    roots = polyroots([1, 0, p, q, r, s], maxsteps=400, extraprec=200)
    ths = [theta([roots[i] for i in perm]) for perm in reps]
    # product of (y - th)
    coeffs = [mpc(1)]
    for t in ths:
        new = [mpc(0)] * (len(coeffs) + 1)
        for i, c in enumerate(coeffs):
            new[i] += c
            new[i + 1] -= c * t
        coeffs = new
    out = []
    for c in coeffs:
        n = nint(c.real)
        assert abs(c - n) < mpf(10) ** -30, (c, n)
        out.append(int(n))
    return out  # descending: y^6 ... y^0

P, Q, R, S = symbols("p q r s")
weights = {P: 2, Q: 3, R: 4, S: 5}
def monomials(w):
    out = []
    for i in range(w // 2 + 1):
        for j in range(w // 3 + 1):
            for k in range(w // 4 + 1):
                rest = w - 2 * i - 3 * j - 4 * k
                if rest >= 0 and rest % 5 == 0:
                    out.append((i, j, k, rest // 5))
    return out

random.seed(7)
formulas = []
for k in range(1, 7):
    mons = monomials(4 * k)
    n = len(mons)
    rows, rhs = [], []
    while len(rows) < n + 8:
        p, q, r, s = [random.randint(-6, 6) for _ in range(4)]
        rows.append([p**i * q**j * r**kk * s**l for (i, j, kk, l) in mons])
        rhs.append(resolvent(p, q, r, s)[k])
    A = Matrix(rows); b = Matrix(rhs)
    sol = (A.T * A).LUsolve(A.T * b)
    assert A * sol == b, "inconsistent fit"
    expr = sum(c * P**i * Q**j * R**kk * S**l for c, (i, j, kk, l) in zip(sol, mons))
    formulas.append(expr)
    print(f"y^{6-k}: {len(mons)} monomials ->", expr)

# independent check on fresh random quintics, larger coefficients
random.seed(99)
for _ in range(30):
    p, q, r, s = [random.randint(-40, 40) for _ in range(4)]
    exact = resolvent(p, q, r, s)
    got = [1] + [int(f.subs({P: p, Q: q, R: r, S: s})) for f in formulas]
    assert exact == got, (p, q, r, s, exact, got)
print("formulas verified on 30 fresh quintics")


