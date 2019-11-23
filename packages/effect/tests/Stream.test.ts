import * as S from "../src/stream/stream";
import * as SK from "../src/stream/sink";
import * as T from "../src";
import * as M from "../src/managed";
import * as assert from "assert";
import * as ref from "../src/ref";
import * as W from "waveguide/lib/wave";
import * as array from "fp-ts/lib/Array";

import { none, some } from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { eqNumber } from "fp-ts/lib/Eq";
import { Sink, liftPureSink, collectArraySink } from "../src/stream/sink";
import { sinkCont, SinkStep, sinkDone } from "../src/stream/step";
import { FunctionN, identity } from "fp-ts/lib/function";
import { after, delay, zip } from "waveguide/lib/wave";
import { expect } from "chai";

export async function expectExitIn<E, A, B>(
  ioa: T.Effect<T.NoEnv, E, A>,
  f: FunctionN<[T.Exit<E, A>], B>,
  expected: B
): Promise<void> {
  const result = await T.run(ioa)();
  expect(assert.deepEqual(f(result), expected));
}

export function expectExit<E, A>(
  ioa: T.Effect<T.NoEnv, E, A>,
  expected: T.Exit<E, A>
): Promise<void> {
  return expectExitIn(ioa, identity, expected);
}

describe("Stream", () => {
  it("should use fromArray", async () => {
    const s = S.fromArray([0, 1, 2]);

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [0, 1, 2]);
  });

  it("should use fromRange", async () => {
    const s = S.fromRange(0);

    const res = await T.promise(S.collectArray(S.take(s, 3)));

    assert.deepEqual(res, [0, 1, 2]);
  });

  it("should use once", async () => {
    const s = S.once(0);

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [0]);
  });

  it("should use repeatedly", async () => {
    const s = S.repeatedly(0);

    const res = await T.promise(S.collectArray(S.take(s, 3)));

    assert.deepEqual(res, [0, 0, 0]);
  });

  it("should use periodically", async () => {
    const s = S.periodically(10);

    const res = await T.promise(S.collectArray(S.takeWhile(s, n => n < 10)));

    assert.deepEqual(res, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("should use empty", async () => {
    const s = S.empty;

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, []);
  });

  it("should use raised", async () => {
    const s = S.raised("message");

    const res = await T.run(S.collectArray(s))();

    assert.deepEqual(res, T.raise("message"));
  });

  it("should use aborted", async () => {
    const s = S.aborted("message");

    const res = await T.run(S.collectArray(s))();

    assert.deepEqual(res, T.abort("message"));
  });

  it("should use fromOption - none", async () => {
    const s = S.fromOption(none);

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, []);
  });

  it("should use fromOption - some", async () => {
    const s = S.fromOption(some(1));

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [1]);
  });

  it("should use zipWithIndex", async () => {
    const s = S.zipWithIndex(S.fromArray([0, 1]));

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [
      [0, 0],
      [1, 1]
    ]);
  });

  it("should use mapWith", async () => {
    const s = pipe(
      S.fromArray([0, 1, 2]),
      S.mapWith(n => n + 1)
    );

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [1, 2, 3]);
  });

  it("should use as", async () => {
    const s = S.as(S.fromArray([0]), 1);

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [1]);
  });

  it("should use filter", async () => {
    const s = S.filter(S.fromArray([0]), n => n > 0);

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, []);
  });

  it("should use filter - 2", async () => {
    const s = S.filter(S.fromArray([1]), n => n > 0);

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [1]);
  });

  it("should use distinctAdjacent", async () => {
    const s = pipe(
      S.fromArray([0, 0, 1, 2, 2, 3]),
      S.distinctAdjacent(eqNumber)
    );

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [0, 1, 2, 3]);
  });

  it("should use filterWith", async () => {
    const s = pipe(
      S.fromArray([0]),
      S.filterWith(n => n > 0)
    );

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, []);
  });

  it("should use dropWith", async () => {
    const s = pipe(S.fromArray([0]), S.dropWith(1));

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, []);
  });

  it("should use zipWith", async () => {
    const sl = S.empty;
    const sr = S.empty;
    const z = S.zipWith(sl, sr, (l, r) => 0);

    const res = await T.promise(S.collectArray(z));

    assert.deepEqual(res, []);
  });

  it("should use zipWith - 2", async () => {
    const sl = S.fromArray([0, 1, 2]);
    const sr = S.empty;
    const z = S.zipWith(sl, sr, (l, r) => l + r);

    const res = await T.promise(S.collectArray(z));

    assert.deepEqual(res, []);
  });

  it("should use dropWith - 2", async () => {
    const s = pipe(S.fromArray([0, 1]), S.dropWith(1));

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [1]);
  });

  it("should use intoManaged", async () => {
    const sm = M.pure(collectArraySink<T.NoEnv, T.NoErr, number>());

    const s = S.intoManaged(S.fromArray([0, 1, 2]), sm);

    const res = await T.promise(s);

    assert.deepEqual(res, [0, 1, 2]);
  });

  it("should use intoLeftover", async () => {
    const sl = collectArraySink<T.NoEnv, T.NoErr, number>();

    const s = S.intoLeftover(S.fromArray([0, 1, 2]), sl);

    const res = await T.promise(s);

    assert.deepEqual(res, [[0, 1, 2], []]);
  });

  it("should use fold", async () => {
    const s = S.fold(S.fromArray([1, 1, 1]), (n, e) => n + e, 0);

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [3]);
  });

  it("should use fold - 2", async () => {
    const s = S.fold(S.fromArray([]), (n, e) => n + e, 0);

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [0]);
  });

  it("should use scan", async () => {
    const s = S.scan(S.fromArray([1, 1, 1]), (n, e) => n + e, 0);

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [0, 1, 2, 3]);
  });

  it("should use flatten", async () => {
    const s = S.flatten(
      S.fromArray([S.fromArray([0, 1, 2]), S.fromArray([0, 1, 2])])
    );

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [0, 1, 2, 0, 1, 2]);
  });

  it("should use mapM", async () => {
    const s = S.mapM(S.fromArray([0, 1, 2]), n => T.right(n + 1));

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [1, 2, 3]);
  });

  it("should use concat", async () => {
    const s = S.concat(S.fromArray([0]), S.fromOption(some(1)));

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [0, 1]);
  });

  it("should use fromIteratorUnsafe", async () => {
    function makeRangeIterator(start = 0, end = Infinity, step = 1) {
      let nextIndex = start;
      let iterationCount = 0;

      const rangeIterator = {
        next: function() {
          let result: any;
          if (nextIndex < end) {
            result = { value: nextIndex, done: false };
            nextIndex += step;
            iterationCount++;
            return result;
          }
          return { value: iterationCount, done: true };
        }
      };
      return rangeIterator;
    }

    const s = S.fromIteratorUnsafe(makeRangeIterator(1, 10, 2));

    const res = await T.promise(S.collectArray(s));

    assert.deepEqual(res, [1, 3, 5, 7, 9]);
  });

  it("should zip two streams", async () => {
    type EnvA = { a: number };
    type EnvB = { b: number };

    const streamA = S.repeat(S.encaseEffect(T.access(({ a }: EnvA) => a)));
    const streamB = S.repeat(S.encaseEffect(T.access(({ b }: EnvB) => b)));

    // $ExpectType Managed<EnvA & EnvB, never, Fold<EnvA & EnvB, never, readonly [number, number]>>
    const zip = S.zip(streamA, streamB);

    const res = await T.promise(
      T.provide<EnvA & EnvB>({ a: 1, b: 1 })(
        // $ExpectType Effect<EnvA & EnvB, never, (readonly [number, number])[]>
        S.collectArray(S.take(zip, 3))
      )
    );

    assert.deepEqual(res, [
      [1, 1],
      [1, 1],
      [1, 1]
    ]);
  });

  it("should use stream with environment", async () => {
    type Config = { initial: number };
    type ConfigB = { second: number };

    const a = S.encaseEffect(T.access(({ initial }: Config) => initial)); // $ExpectType Managed<Config, never, Fold<Config, never, number>>
    const s = S.chain(a, n => S.fromRange(n, 1, 10)); // $ExpectType Managed<Config, never, Fold<Config, never, number>>

    // $ExpectType Managed<Config & ConfigB, never, Fold<Config & ConfigB, never, number>>
    const m = S.chain(s, n =>
      S.encaseEffect(T.access(({ second }: ConfigB) => n + second))
    );

    const g = S.chain(m, n => S.fromRange(0, 1, n)); // $ExpectType Managed<Config & ConfigB, never, Fold<Config & ConfigB, never, number>>
    const r = S.collectArray(g); // $ExpectType Effect<Config & ConfigB, never, number[]>

    const res = await T.promise(
      T.provide<Config & ConfigB>({ initial: 1, second: 1 })(r)
    );

    assert.deepEqual(
      res,
      // prettier-ignore
      [ 0, 1, 0, 1, 2, 0, 1, 2, 3, 0, 1, 2
      , 3, 4, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3
      , 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 7, 0
      , 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3
      , 4, 5, 6, 7, 8, 9]
    );
  });

  // from https://github.com/rzeigler/waveguide-streams/blob/master/test/stream.spec.ts
  describe("peel", () => {
    const multiplier = SK.map(SK.headSink<T.NoEnv, never, number>(), opt =>
      opt._tag === "Some" ? opt.value : 1
    );
    it("should handle empty arrays", () => {
      const s1 = (S.empty as any) as S.Stream<T.NoEnv, never, number>;
      const s2 = S.peel(s1, multiplier);
      return expectExit(
        S.collectArray(S.chain(s2, ([_h, r]) => r)),
        T.done([])
      );
    });
    it("should extract a head and return a subsequent element", () => {
      const s1 = S.fromArray([2, 6, 9]);
      const s2 = S.chain(S.peel(s1, multiplier), ([head, rest]) => {
        return S.map(rest, v => v * head);
      });
      return expectExit(S.collectArray(s2), T.done([12, 18]));
    });
    it("should compose", () => {
      const s1 = S.fromRange(3, 1, 9); // emits 3, 4, 5, 6, 7, 8
      const s2 = S.filter(s1, x => x % 2 === 0); // emits 4 6 8
      const s3 = S.chain(S.peel(s2, multiplier), ([head, rest]) => {
        // head is 4
        return S.map(rest, v => v * head); // emits 24 32
      });
      return expectExit(S.collectArray(s3), T.done([24, 32]));
    });
    it("should raise errors", () => {
      const s1 = (S.fromArray([
        S.raised("boom"),
        S.once(1)
      ]) as any) as S.Stream<
        T.NoEnv,
        string,
        S.Stream<T.NoEnv, string, number>
      >;
      const s2 = S.flatten(s1);
      const s3 = S.peel(s2, multiplier);
      return expectExit(S.collectArray(s3), T.raise("boom"));
    });
    it("should raise errors in the remainder stream", () => {
      const s1 = (S.fromArray([
        S.once(2),
        S.raised("boom"),
        S.once(1)
      ]) as any) as S.Stream<
        T.NoEnv,
        string,
        S.Stream<T.NoEnv, string, number>
      >;
      const s2 = S.flatten(s1);
      const s3 = S.chain(S.peel(s2, multiplier), ([_head, rest]) => rest);
      return expectExit(S.collectArray(s3), T.raise("boom"));
    });
  });

  describe("transduce", () => {
    // We describe transduction as the process of consuming some elements (1 or more) to produce an output element
    // The transducer used for the test is a summer
    // i.e. it consumes the number of elements to read, then that number of elements, and then outputs the sum
    function transducer(): Sink<
      T.NoEnv,
      never,
      readonly [number, number],
      number,
      number
    > {
      const initial = sinkCont([-1, 0] as const);

      function step(
        state: readonly [number, number],
        next: number
      ): SinkStep<never, readonly [number, number]> {
        if (state[0] < 0) {
          return sinkCont([next, 0] as const);
        }
        if (state[0] === 1) {
          return sinkDone(
            [0 as number, state[1] + next] as const,
            [] as never[]
          );
        }
        return sinkCont([state[0] - 1, state[1] + next] as const);
      }

      function extract(state: readonly [number, number]): number {
        return state[1];
      }

      return liftPureSink({ initial, step, extract });
    }

    it("should perform transduction", () => {
      const s1 = S.fromArray([2, 4, 6, 3, -10, -20, -30, 2]);
      const s2 = S.transduce(s1, transducer());
      return expectExit(S.collectArray(s2), T.done([10, -60, 0]));
    });

    it("should transduce empty streams", () => {
      const s1 = S.fromArray([]);
      const s2 = S.transduce(s1, transducer());
      return expectExit(S.collectArray(s2), T.done([]));
    });

    function slidingBuffer(): Sink<T.NoEnv, never, number[], number, number[]> {
      const initial = sinkCont([] as number[]);

      function step(state: number[], next: number): SinkStep<number, number[]> {
        const more = [...state, next];
        if (more.length === 3) {
          return sinkDone(more, more.slice(1));
        } else {
          return sinkCont(more);
        }
      }

      function extract(state: number[]): number[] {
        return state;
      }

      return liftPureSink({ initial, step, extract });
    }

    it("should handle remainders set correctly", () => {
      const s1 = S.fromRange(0, 1, 5);
      const s2 = S.transduce(s1, slidingBuffer());
      return expectExit(
        S.collectArray(s2),
        T.done([
          [0, 1, 2],
          [1, 2, 3],
          [2, 3, 4],
          [3, 4] // final emission happens here but there is no way of filling the buffer beyond
        ])
      );
    });
  });

  describe("switchLatest", () => {
    it("should produce the latest elements", () => {
      // Two streams that emit 2 elements then hang forever
      const s1 = S.take(S.periodically(50), 2);
      const s2 = S.as(
        s1,
        S.concat(
          S.take(S.periodically(10), 2),
          (S.never as any) as S.Stream<T.NoEnv, never, number>
        )
      );
      // A third stream that emits 3 elements
      const after30 = T.as(_ => after(50), S.take(S.periodically(20), 4));
      const s3 = S.switchLatest(S.concat(s2, S.encaseEffect(after30)));
      return expectExit(S.collectArray(s3), T.done([0, 1, 0, 1, 0, 1, 2, 3]));
    });
    it("should fail with errors in outer stream", () => {
      const io = T.effectMonad.chain(ref.makeRef(0), cell => {
        const s1: T.Effect<
          T.NoEnv,
          string,
          S.Stream<T.NoEnv, string, number>
        > = T.delay(T.right(S.encaseEffect(cell.set(1))), 50) as any;
        const s2: T.Effect<
          T.NoEnv,
          string,
          S.Stream<T.NoEnv, string, number>
        > = T.delay(T.left("boom"), 50) as any;
        const s3: T.Effect<
          T.NoEnv,
          string,
          S.Stream<T.NoEnv, string, number>
        > = T.delay(T.right(S.encaseEffect(cell.set(2))), 50) as any;

        const set: S.Stream<
          T.NoEnv,
          string,
          T.Effect<T.NoEnv, string, S.Stream<T.NoEnv, string, number>>
        > = S.fromArray([s1, s2, s3]) as any;

        const stream: S.Stream<
          T.NoEnv,
          string,
          S.Stream<T.NoEnv, string, number>
        > = S.mapM(set, identity);

        const drain = T.result(S.drain(S.switchLatest(stream)));
        return r => zip(drain(r), delay(cell.get(r), 100));
      });
      return expectExit(
        io,
        T.done([T.raise("boom"), 1] as const) as T.Exit<
          never,
          readonly [T.Exit<string, void>, number]
        >
      );
    });
    it("should fail with errors in the inner streams", () => {
      const io = T.effectMonad.chain(ref.makeRef(0), cell => {
        const s1: T.Effect<
          T.NoEnv,
          string,
          S.Stream<T.NoEnv, string, number>
        > = T.delay(T.right(S.encaseEffect(cell.set(1))), 50) as any;
        const s2: T.Effect<
          T.NoEnv,
          string,
          S.Stream<T.NoEnv, string, number>
        > = T.delay(T.right(S.encaseEffect(T.left("boom"))), 50) as any;
        const s3: T.Effect<
          T.NoEnv,
          string,
          S.Stream<T.NoEnv, string, number>
        > = T.delay(T.right(S.encaseEffect(cell.set(2))), 50) as any;

        const set: S.Stream<
          T.NoEnv,
          string,
          T.Effect<T.NoEnv, string, S.Stream<T.NoEnv, string, number>>
        > = S.fromArray([s1, s2, s3]) as any;

        const stream: S.Stream<
          T.NoEnv,
          string,
          S.Stream<T.NoEnv, string, number>
        > = S.mapM(set, identity);

        const drain = T.result(S.drain(S.switchLatest(stream)));
        return r => zip(drain(r), T.delay(cell.get, 100)(r));
      });

      return expectExit(
        io,
        T.done([T.raise("boom"), 1] as const) as T.Exit<
          never,
          readonly [T.Exit<string, void>, number]
        >
      );
    });
    it("switching should occur", () => {
      const s1 = S.take(S.periodically(50), 10);
      const s2 = S.chainSwitchLatest(s1, i =>
        S.as(S.take(S.periodically(10), 10), i)
      );
      const output = S.collectArray(s2);
      return T.promise(output).then(values => {
        const pairs = array.chunksOf(2)(values);
        pairs.forEach(([f, s]) =>
          expect(values.lastIndexOf(f)).to.be.greaterThan(values.indexOf(s))
        );
      });
    });
  });
  function repeater<E, A>(
    w: T.Effect<T.NoEnv, E, A>,
    n: number
  ): T.Effect<T.NoEnv, E, A> {
    if (n <= 1) {
      return w;
    } else {
      return r => W.parApplySecond(w(r), repeater(w, n - 1)(r));
    }
  }
  describe("merge", function() {
    jest.setTimeout(20000);

    const r = T.fromIO(() => Math.random());

    function range(max: number): T.Effect<T.NoEnv, never, number> {
      return T.effectMonad.map(r, n => Math.round(n * max));
    }

    function randomWait(max: number): T.Effect<T.NoEnv, never, void> {
      return T.effectMonad.chain(range(max), a => _ => W.after(a));
    }

    it("should merge output", () => {
      const s1 = S.fromRange(0, 1, 10);
      const s2 = S.chainMerge(
        s1,
        i => S.mapM(S.fromRange(0, 1, 20), () => T.as(randomWait(50), i)),
        4
      );
      const output = S.collectArray(s2);
      const check = T.effectMonad.chain(output, values =>
        T.fromIO(() => {
          const uniq = array
            .uniq(eqNumber)(values)
            .sort();
          const stats = array.array.map(
            uniq,
            u =>
              [
                u,
                array.array.filter(values, v => v === u).length,
                values.indexOf(u),
                values.lastIndexOf(u)
              ] as const
          );
          stats.forEach(([_i, ct]) => {
            expect(ct).to.equal(20);
          });
          return;
        })
      );
      return T.promise(repeater(check, 10));
    });
  });
});