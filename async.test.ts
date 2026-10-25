import {describe, expect, it, vi} from 'vitest';
import { AsyncEither, EitherCell, left, right, type Either} from './Either';

describe('native promise settlement', () => {
    it('resolves as async function returning to the Either instance', async () => {
        const cb = async () => right('value3');

        const settled = await cb();

        expect(settled).toEqualInstanceOf(EitherCell);
        expect(settled.isRight()).toEqual(true);
        expect(settled.value).toEqual('value3')
    })

    it('delivers the Either to a plain .then callback', async () => {
        const cb = async () => right('value3');
        let seen: Either<never, string> | undefined;
        await cb().then((either) => {
            seen = either;
        })
        expect(seen?.isRight()).toEqual(true)

    })

    it('resolves an async function returning left to the Either instance too', async () => {
        const a5 = async () => right('value5')
        const settled = await a5();
        expect(settled).toEqualInstanceOf(EitherCell)
        expect(settled.isLeft()).toEqual(true)
    })
})

describe('AsyncEither.from routing', () => {
    it('sends a resolved Right to asyncRight with the inner value', async () => {
        const a3 = async () => right('value3')
        const onRight = vi.fn();
        const onLeft = vi.fn();
        const flow = AsyncEither.from(a3())
            .asyncRight(onRight)
            .asyncLeft(onLeft)
        await flow
        expect(onRight).toHaveBeenCalledTimes(1);
        expect(onRight).toHaveBeenCalledWith('value3');
        expect(onLeft).not.toHaveBeenCalled();
    });

    it('sends a rejected with Left promise to asyncLeft with the inner value', async () => {
        const a4 = () => Promise.reject(left('value4'))
        const onRight = vi.fn();
        const onLeft = vi.fn();
        const flow = AsyncEither.from(a4())
            .asyncRight(onRight)
            .asyncLeft(onLeft)
        await flow;
        expect(onRight).not.toHaveBeenCalled()
        expect(onLeft).toHaveBeenCalledTimes(1)
        expect(onLeft).toHaveBeenCalledWith('value4')
    })

    it('normalizes a rejection carrying a plain error into Left with that error', async () => {
        const boom = new Error('boom');
        const onLeft = vi.fn();
        const flow = AsyncEither.from(Promise.reject(boom)).asyncLeft(onLeft);
        await flow;
        expect(onLeft).toHaveBeenCalledTimes(1);
        expect(onLeft).toHaveBeenCalledWith(boom)
    })

    it('sends a resolved Left to asyncLeft for async functions', async () => {
        const a5 = async () => left('value5');
        const onRight = vi.fn();
        const onLeft = vi.fn();
        const flow = AsyncEither.from(a5())
            .asyncRight(onRight)
            .asyncLeft(onLeft);
        await flow;
        expect(onRight).not.toHaveBeenCalled()
        expect(onLeft).toHaveBeenCalledTimes(1)
        expect(onLeft).toHaveBeenCalledWith('value5')
    });

    it('treats a fulfilled plain promise as a Right of its value', async () => {
        const onRight = vi.fn();
        const onLeft = vi.fn();
        const flow = AsyncEither.from(Promise.resolve('plain'))
            .asyncRight(onRight)
            .asyncLeft(onLeft);
        await flow;
        expect(onRight).toHaveBeenCalledWith('plain')
        expect(onLeft).not.toHaveBeenCalled();
    })

    it('fires handlers registered after settlement', async () => {
        const a3 = async () => right('late');
        const flow = AsyncEither.from(a3());
        await flow;
        const onRight = vi.fn();
        flow.asyncRight(onRight)
        await flow;
        expect(onRight).toHaveBeenCalledTimes(1)
        expect(onRight).toHaveBeenCalledWith('late')
    })

    it('fires every handler registered on the same side', async () => {
        const first = vi.fn();
        const second = vi.fn();
        const flow = AsyncEither.from(Promise.resolve(right('x')))
            .asyncRight(first)
            .asyncRight(second)
        await flow;
        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(1)
    })

    it('awaits to the underlying Either', async () => {
        const a5 = async () => left('value5');
        const settled = await AsyncEither.from(a5());
        expect(settled.isLeft()).toEqual(true)
    })
});