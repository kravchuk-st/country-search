// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { spainResponse } from './fixtures/spain.js';
import type { SearchController, SearchState } from './searchController.js';
import type { ApiCountry } from './types.js';
import { createApp } from './view.js';

const spain = spainResponse[0] as ApiCountry;

function createStubController(initial: SearchState = { status: 'idle' }) {
  let state = initial;
  const listeners = new Set<(state: SearchState) => void>();
  const controller: SearchController = {
    input: vi.fn(),
    retry: vi.fn(),
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const emit = (next: SearchState) => {
    state = next;
    listeners.forEach((listener) => listener(next));
  };
  return { controller, emit };
}

function mount(initial?: SearchState) {
  const { controller, emit } = createStubController(initial);
  const app = createApp(controller);
  document.body.replaceChildren(app);
  return { app, controller, emit };
}

describe('view', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    // jsdom does not implement the modal dialog API, a minimal stand-in is enough here.
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open');
    };
  });

  it('shows a hint and no cards while idle', () => {
    const { app } = mount();

    expect(app.querySelector('.status')?.textContent).toContain('Start typing');
    expect(app.querySelectorAll('.card')).toHaveLength(0);
  });

  it('passes every change of the input to the controller', () => {
    const { app, controller } = mount();
    const input = app.querySelector('input') as HTMLInputElement;

    input.value = 'spa';
    input.dispatchEvent(new Event('input'));

    expect(controller.input).toHaveBeenCalledWith('spa');
  });

  it('shows a loading indicator with the query', () => {
    const { app, emit } = mount();

    emit({ status: 'loading', query: 'spain' });

    expect(app.querySelector('.spinner')).not.toBeNull();
    expect(app.querySelector('.status')?.textContent).toContain('spain');
  });

  it('renders one card per country with its main data', () => {
    const { app, emit } = mount();

    emit({ status: 'results', query: 'spain', countries: [spain] });

    const cards = app.querySelectorAll('.card');
    expect(cards).toHaveLength(1);
    expect(cards[0]?.textContent).toContain('Spain');
    expect(cards[0]?.textContent).toContain('Capital: Madrid');
    expect(cards[0]?.textContent).toContain('Region: Europe');
    expect(cards[0]?.textContent).toContain('Population: 47,351,567');
    expect(cards[0]?.querySelector('img')?.getAttribute('src')).toBe('https://flagcdn.com/es.svg');
  });

  it('clears the cards when the state is no longer "results"', () => {
    const { app, emit } = mount();
    emit({ status: 'results', query: 'spain', countries: [spain] });

    emit({ status: 'idle' });

    expect(app.querySelectorAll('.card')).toHaveLength(0);
  });

  it('shows text from the API as text, never as HTML', () => {
    const { app, emit } = mount();
    const hostile = { ...spain, name: '<img src=x onerror=alert(1)>', capital: '<b>bold</b>' };

    emit({ status: 'results', query: 'x', countries: [hostile] });

    expect(app.querySelector('.card__name')?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(app.querySelectorAll('.card img')).toHaveLength(1); // only the flag
    expect(app.querySelector('.card b')).toBeNull();
  });

  it.each([
    ['an empty url', ''],
    ['a javascript: url', 'javascript:alert(1)'],
    ['an http url', 'http://x.test/f.svg'],
  ])('does not render an image for %s', (_case, url) => {
    const { app, emit } = mount();

    emit({ status: 'results', query: 'x', countries: [{ ...spain, flags: { svg: url } }] });

    expect(app.querySelector('.card img')).toBeNull();
  });

  it('shows a friendly "nothing found" message that does not look like an error', () => {
    const { app, emit } = mount();

    emit({ status: 'empty', query: 'zzzzzz' });

    expect(app.querySelector('.status')?.textContent).toContain('Nothing found for “zzzzzz”');
    expect(app.querySelector('.status__text--error')).toBeNull();
    expect(app.querySelector('.status__retry')).toBeNull();
  });

  it.each([
    ['timeout', 'too long'],
    ['http', 'server returned an error'],
    ['network', 'Could not reach'],
  ] as const)('shows an error with a retry button for a %s failure', (failure, text) => {
    const { app, emit } = mount();

    emit({ status: 'error', query: 'spain', failure });

    expect(app.querySelector('.status__text--error')?.textContent).toContain(text);
    expect(app.querySelector('.status__retry')).not.toBeNull();
  });

  it('asks the controller to retry when the retry button is clicked', () => {
    const { app, controller, emit } = mount();
    emit({ status: 'error', query: 'spain', failure: 'http' });

    (app.querySelector('.status__retry') as HTMLButtonElement).click();

    expect(controller.retry).toHaveBeenCalledTimes(1);
  });

  it('opens the details of a country when its card is clicked', () => {
    const { app, emit } = mount();
    emit({ status: 'results', query: 'spain', countries: [spain] });

    (app.querySelector('.card') as HTMLButtonElement).click();

    const dialog = app.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.textContent).toContain('Spain (España) is a country in Southern Europe, Europe.');
    expect(dialog.textContent).toContain('505,992 km²');
    expect(dialog.textContent).toContain('AND, FRA, GIB, PRT, MAR');
    expect(dialog.textContent).toContain('Spanish (Español)');
    expect(dialog.textContent).toContain('Euro (EUR, €)');
  });

  it('closes the details with the close button', () => {
    const { app, emit } = mount();
    emit({ status: 'results', query: 'spain', countries: [spain] });
    (app.querySelector('.card') as HTMLButtonElement).click();

    (app.querySelector('.details__close') as HTMLButtonElement).click();

    expect(app.querySelector('dialog')?.hasAttribute('open')).toBe(false);
  });

  it('shows a dash for details the API does not provide', () => {
    const { app, emit } = mount();
    const bare = { ...spain, area: undefined, borders: undefined, languages: undefined, currencies: undefined };
    emit({ status: 'results', query: 'x', countries: [bare] });

    (app.querySelector('.card') as HTMLButtonElement).click();

    const values = [...app.querySelectorAll('.details__list dd')].map((dd) => dd.textContent);
    expect(values).toEqual(['Madrid', 'Europe', '47,351,567', '—', '—', '—', '—']);
  });
});
