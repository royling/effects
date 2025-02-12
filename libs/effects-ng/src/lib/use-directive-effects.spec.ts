import { Component, Injectable, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createAction, createEffect } from '@ngneat/effects';
import { tap } from 'rxjs';
import { ofType } from 'ts-action-operators';
import { Actions } from './actions';
import { provideEffectsManager } from './provide-effects-manager';
import { useDirectiveEffects } from './use-directive-effects';
import { provideEffects } from './provide-effects';

const spy = jest.fn();
const spy2 = jest.fn();
const loadTodos = createAction('[Todos] Load Todos');
const loadTodos2 = createAction('[Todos] Load Todos 2');

@Injectable()
class EffectsOne {
  loadTodos$ = createEffect((actions) =>
    actions.pipe(ofType(loadTodos), tap(spy))
  );
}

@Injectable()
class EffectsTwo {
  loadTodos2$ = createEffect((actions) =>
    actions.pipe(ofType(loadTodos2), tap(spy2))
  );
}

@Injectable()
class EffectsThree {}

function createComponentType(...providers: Type<any>[]): Type<any> {
  @Component({
    template: '',
    standalone: true,
    hostDirectives: [useDirectiveEffects(...providers)],
  })
  class TodoComponent {
    constructor(private actions: Actions) {
      this.actions.dispatch(loadTodos());
    }
  }

  return TodoComponent;
}

describe('useDirectiveEffects', () => {
  beforeEach(() => {
    spy.mockClear();
    spy2.mockClear();
  });

  it('should provide effects', () => {
    const componentType = createComponentType(
      EffectsOne,
      EffectsTwo,
      EffectsThree
    );

    TestBed.configureTestingModule({
      imports: [componentType],
      providers: [provideEffectsManager()],
    });

    const injector =
      TestBed.createComponent(componentType).debugElement.injector;

    const effectsOneInstance = injector.get(EffectsOne);
    const effectsTwoInstance = injector.get(EffectsTwo);
    const effectsThreeInstance = injector.get(EffectsThree);

    expect(effectsOneInstance).toBeDefined();
    expect(effectsTwoInstance).toBeDefined();
    expect(effectsThreeInstance).toBeDefined();
  });

  it('should trigger effects on action dispatch', () => {
    const componentType = createComponentType(
      EffectsOne,
      EffectsTwo,
      EffectsThree
    );

    TestBed.configureTestingModule({
      imports: [componentType],
      providers: [provideEffectsManager()],
    });

    TestBed.createComponent(componentType);

    expect(spy).toHaveBeenCalled();
  });

  it('should subscribe on the same effects only once', () => {
    const componentType = createComponentType(
      EffectsOne,
      EffectsOne,
      EffectsOne,
      EffectsTwo
    );

    TestBed.configureTestingModule({
      imports: [componentType],
      providers: [provideEffectsManager(), provideEffects(EffectsTwo)],
    });
    TestBed.createComponent(componentType);
    TestBed.createComponent(componentType);

    TestBed.inject(Actions).dispatch(loadTodos2());

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy2).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe only from effects that was registered via useDirectiveEffects when component is destroyed', () => {
    const componentType = createComponentType(
      EffectsOne,
      EffectsOne,
      EffectsTwo
    );

    @Component({
      template: '',
      standalone: true,
      hostDirectives: [useDirectiveEffects(EffectsOne, EffectsTwo)],
    })
    class TestComponent {
      constructor(private actions: Actions) {
        this.actions.dispatch(loadTodos());
      }
    }

    TestBed.configureTestingModule({
      imports: [componentType, TestComponent],
      providers: [provideEffectsManager(), provideEffects(EffectsTwo)],
    });

    const fixture = TestBed.createComponent(componentType);
    const fixture2 = TestBed.createComponent(componentType);
    const fixture3 = TestBed.createComponent(TestComponent);
    const actions = TestBed.inject(Actions);

    actions.dispatch(loadTodos2());

    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy2).toHaveBeenCalledTimes(1);

    fixture.destroy();
    fixture2.destroy();

    actions.dispatch(loadTodos(), loadTodos2());

    expect(spy).toHaveBeenCalledTimes(4);
    expect(spy2).toHaveBeenCalledTimes(2);

    fixture3.destroy();

    actions.dispatch(loadTodos(), loadTodos2());

    expect(spy).toHaveBeenCalledTimes(4);
    expect(spy2).toHaveBeenCalledTimes(3);
  });

  it("should thrown an error if effects manager wasn't provided at the root level", () => {
    const componentType = createComponentType(
      EffectsOne,
      EffectsTwo,
      EffectsThree
    );

    TestBed.configureTestingModule({
      imports: [componentType],
    });

    expect(() => TestBed.createComponent(componentType)).toThrowError();
  });
});
