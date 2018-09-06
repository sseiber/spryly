import { toposort } from '../toposort';

it('should resolve complex graph', () => {
    const graph = [
        ['1', '3'],
        ['2', '1'],
        ['3', 'ROOT']
    ];
    const result = toposort(graph);

    expect(result).toBeDefined();

    expect(result[0]).toEqual('ROOT');
    expect(result[1]).toEqual('3');
    expect(result[2]).toEqual('1');
    expect(result[3]).toEqual('2');
});

it('should resolve a 2 node graph', () => {
    const graph = [
        ['1', '2']
    ];
    const result = toposort(graph);

    expect(result).toBeDefined();

    expect(result[0]).toEqual('2');
    expect(result[1]).toEqual('1');
});

it('should resolve a 4 node graph with 2 islands', () => {
    const graph = [
        ['1', '2'],
        ['3', '4']
    ];
    const result = toposort(graph);

    expect(result).toBeDefined();

    expect(result[0]).toEqual('4');
    expect(result[1]).toEqual('3');
    expect(result[2]).toEqual('2');
    expect(result[3]).toEqual('1');
});

it('should resolve a 3 node graph with one parent', () => {
    //     3
    //    / \
    //   1   2
    const graph = [
        ['1', '3'],
        ['2', '3']
    ];
    const result = toposort(graph);

    expect(result).toBeDefined();

    expect(result[0]).toEqual('3');
    expect(result[1]).toEqual('2');
    expect(result[2]).toEqual('1');
});

it('should throw by default for a cyclic graph', () => {
    const graph = [
        ['1', '2'],
        ['2', '1']
    ];

    expect(() => toposort(graph)).toThrowError('Cyclic graph detected');
});

it('should not throw for a cyclic graph when configured', () => {
    const graph = [
        ['1', '2'],
        ['2', '1']
    ];

    const result = toposort(graph, { continueOnCircularDependency: true });

    expect(result[0]).toEqual('1');
    expect(result[1]).toEqual('2');
});
