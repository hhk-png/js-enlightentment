import './style.css'

function* counter() {
    let count: number = 0;
    while (true) {
        count += 1;
        yield count;
    }
}

const gen: Generator<number, void, unknown> = counter();

console.log(gen.next().value);
console.log(gen.next().value);

function counter1(): () => number {
    let count: number = 0;
    return function counter_generator(): number {
        count += 1;
        return count;
    }
}

function constant(value: number): () => number {
    return function constant_generator(): number {
        return value;
    }
}

type IntFunc = () => number | undefined
// 在每次调用的时候返回一个递增的整数，并在递增到一定的值时开始返回undefined
function integer(from: number = 0, to: number = Number.MAX_SAFE_INTEGER, step: number = 1): IntFunc {
    return function(): number | undefined {
        if (from < to) {
            const result: number = from;
            from += step;
            return result;
        }
        return undefined;
    }
}


// 接受一个数组作为参数，产生的生成器每次都会返回数组的下一个元素
function element(array: number[] | string[], gen: IntFunc = integer(0, array.length)): any {
    return function element_generator() {
        const elementIndex = gen();
        if (elementIndex !== undefined) {
            return array[elementIndex];
        }
    }
}

function property(obj: Record<number, any>, gen = element(Object.keys(obj))) {
    return function property_generator() {
        const key = gen();
        if (key !== undefined) {
            return [key, obj[key]];
        }
    };
}

// 接收生成器和数组，它返回的生成器的工作逻辑与传入的生成器一致
//  在每次生成返回值的时候，还会顺便将该值附加到传入的数组中
function collect(generator: any, array: number[]) {
    return function collect_generator() {
        const value = generator();
        if (value !== undefined) {
            array.push(value);
        }
        return value;
    }
}

// 接收一个生成器并一直调用，直到生成器结束并返回undefined
function repeat(generator: any): undefined | number {
    if (generator() !== undefined) {
        return repeat(generator);
    }
}

const my_array: number[] = [];
repeat(collect(integer(0, 7), my_array));
console.log(my_array)

function harvest(generator: any) {
    const array: number[] = [];
    repeat(collect(generator, array));
    return array;
}


console.log(harvest(integer(0, 7)))

function limit(generator: any, count: number = 1) {
    return function() {
        if (count >= 1) {
            count -= 1;
            return generator();
        }
    }
}

function filter(generator: any, predicate: (a: number) => boolean) {
    return function filter_generator(): number {
        const value = generator();
        if (value !== undefined && !predicate(value)) {
            return filter_generator();
        }
        return value;
    }
}

const third_array = harvest(filter(
    integer(0, 42),
    function divisible_by_three(value: number): boolean {
        return (value % 3) === 0;
    }
));

console.log(third_array)

function concat(...generators: any[]) {
    const next = element(generators);
    let generator = next();
    return function concat_generator(): number {
        if (generator !== undefined) {
            const value: number = generator();
            if (value === undefined) {
                generator = next();
                return concat_generator();
            }
            return value;
        }
        return 0;
    }
}

function join(func: any, ...gens: any[]) {
    return function join_generator() {
        return func(...gens.map(function(gen) {
            return gen();
        }));
    }
}

function map(array: number[], func: any) {
    return harvest(join(func, element(array)));
}

function objectify(...names: string[]) {
    return function objectify_constructor(...values: string[]) {
        const object = Object.create(null);
        names.forEach(function(name, name_index) {
            object[name] = values[name_index];
        });
        return object;
    }
}

let data_marry_kill = objectify("date", "marry", "kill");
let little_object = data_marry_kill("butterfly", "unicorn", "monster");
console.log(little_object);


