export class EitherCell<LeftValue, RightValue, Side extends 'left' | 'right'> {
    private constructor(
        public readonly side: Side,
        public readonly value: Side extends 'right' ? RightValue : LeftValue,
    ) {}

    static right<LeftValue = never, RightValue = never>(value: RightValue): EitherCell<LeftValue, RightValue, 'right'> {
        return new EitherCell<LeftValue, RightValue, 'right'>('right', value);
    }

    static left<LeftValue = never, RightValue = never>(value: LeftValue): EitherCell<LeftValue, RightValue, 'left'> {
        return new EitherCell<LeftValue, RightValue, 'left'>('left', value);
    }

    isRight(): this is EitherCell<LeftValue, RightValue, 'right'> {
        return this.side === 'right'
    }

    isLeft(): this is EitherCell<LeftValue, RightValue, 'left'> {
        return this.side === 'left'
    }

    right(onRight: (value: RightValue) => void): this {
        this.side === 'right' && onRight(this.value as RightValue);
        return this;
    }

    left(onLeft: (value: LeftValue) => void): this {
        this.side === 'left' && onLeft(this.value as LeftValue);
        return this;
    }
}

export type Either<LeftValue, RightValue> = EitherCell<LeftValue, RightValue, 'right'> | EitherCell<LeftValue, RightValue, 'left'>;

export const right = <LeftValue = never, RightValue = never>(value: RightValue): Either<LeftValue, RightValue> => EitherCell.right<LeftValue, RightValue>(value)

export const left = <LeftValue = never, RightValue = never>(value: LeftValue): Either<LeftValue, RightValue> => EitherCell.left<LeftValue, RightValue>(value)

export const isEither = (value: unknown): value is Either<unknown, unknown> => value instanceof EitherCell;

export class AsyncEither<LeftValue, RightValue> implements PromiseLike<Either<LeftValue, RightValue>> {
    private constructor(
        private readonly settled: Promise<Either<LeftValue, RightValue>>
    ) {}

    static from<LeftValue, RightValue>(source: Promise<Either<LeftValue, RightValue>>): AsyncEither<LeftValue, RightValue>
    static from<RightValue>(source: Promise<RightValue>): AsyncEither<unknown, RightValue>
    static from(source: Promise<unknown>): AsyncEither<unknown, unknown>  {
        const settled = source.then(
            (value) => isEither(value) ? value : EitherCell.right<unknown, unknown>(value),
            (reason) => isEither(reason) ? reason : EitherCell.left<unknown, unknown>(reason),
        );

        return new AsyncEither(settled)
    }

    asyncRight(onRight: (value: RightValue) => void): this {
        this.settled.then((either) => {
            either.right(onRight)
        })

        return this;
    }

    asyncLeft(onLeft: (value: LeftValue) => void): this {
        this.settled.then((either) => {
            either.left(onLeft)
        })

        return this;
    }

    then<FulfilledResult = Either<LeftValue, RightValue>, RejectedResult = never>(
        onFulfilled?: ((value: Either<LeftValue, RightValue>) => FulfilledResult | PromiseLike<FulfilledResult>) | null,
        onRejected?: ((reason: unknown) => RejectedResult | PromiseLike<RejectedResult>) | null,
    ): PromiseLike<FulfilledResult | RejectedResult> {
        return this.settled.then(onFulfilled, onRejected)
    }
}