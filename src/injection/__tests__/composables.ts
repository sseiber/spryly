
import { StubComposable, Composable, ComposableTarget } from '../composables';
import { DependencyRequest } from '../discovery';

it('[Stub] should expose the same instance as created with', () => {
    const testInstance = { a: 'x ' };
    const stub = new StubComposable(testInstance);

    expect(stub.instance).toEqual(testInstance);
});

it('[Stub] should compose with no errors', async() => {
    const testInstance = { a: 'x ' };
    const stub = new StubComposable(testInstance);

    const errors = await stub.compose();
    expect(errors).toBeNull();
});

it('should be constructed', () => {
    const testInstance: ComposableTarget = {};

    const composable = new Composable(testInstance, []);
    expect(composable).toBeDefined();
});

it('should be constructed with dependencies', () => {
    const testInstance: ComposableTarget & any = {

    };

    const deps: DependencyRequest[] = [{ name: 'x', setter: () => null, required: true }];
    const composable = new Composable(testInstance, deps);
    expect(composable).toBeDefined();
});
